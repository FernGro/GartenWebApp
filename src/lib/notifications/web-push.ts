import webPush, { type PushSubscription } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type WebPushPayload = {
  title: string;
  message: string;
  url?: string;
};

let configured = false;

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  if (!configured) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return true;
}

export async function sendWebPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  gardenId: string,
  payload: WebPushPayload,
) {
  if (!configureWebPush()) {
    return;
  }

  const { data, error } = await supabase
    .from("web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .eq("garden_id", gardenId)
    .eq("is_active", true);

  if (error || !data?.length) {
    if (error) {
      console.error("sendWebPushToUser subscriptions", error.message);
    }
    return;
  }

  await Promise.all(
    data.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("web_push_subscriptions")
            .update({ is_active: false })
            .eq("id", subscription.id);
          return;
        }

        console.error("sendWebPushToUser", error);
      }
    }),
  );
}

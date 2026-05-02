"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function savePushSubscriptionAction(gardenId: string, subscription: BrowserPushSubscription, userAgent?: string) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  if (!gardenId || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    throw new Error("Push-Subscription ist ungueltig.");
  }

  const { error } = await supabase.from("web_push_subscriptions").upsert({
    user_id: user.id,
    garden_id: gardenId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: userAgent ?? null,
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
}

export async function disablePushSubscriptionAction(gardenId: string, endpoint: string) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  if (!gardenId || !endpoint) {
    throw new Error("Push-Subscription fehlt.");
  }

  const { error } = await supabase
    .from("web_push_subscriptions")
    .update({ is_active: false })
    .eq("garden_id", gardenId)
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
}

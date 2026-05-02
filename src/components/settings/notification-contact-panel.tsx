import { sendTelegramTestAction, updateNotificationContactAction } from "@/lib/notifications/contact-actions";
import type { NotificationContact } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { WebPushPanel } from "@/components/settings/web-push-panel";

export function NotificationContactPanel({
  gardenId,
  contact,
}: {
  gardenId: string;
  contact: NotificationContact | null;
}) {
  return (
    <section className="mb-4 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <h2 className="text-lg font-bold">Benachrichtigungen</h2>
      <p className="mt-2 text-sm leading-6 text-[#5a6655]">
        WhatsApp ist nur als Kontaktinfo vorbereitet. Fuer kostenlose automatische Nachrichten ist Telegram besser geeignet.
      </p>
      <form action={updateNotificationContactAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="garden_id" type="hidden" value={gardenId} />
        <label className="text-sm font-semibold">
          WhatsApp Nummer optional
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="whatsapp_phone" defaultValue={contact?.whatsapp_phone ?? ""} placeholder="+491..." />
        </label>
        <label className="text-sm font-semibold">
          Telegram Chat-ID
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="telegram_chat_id" defaultValue={contact?.telegram_chat_id ?? ""} placeholder="123456789" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input defaultChecked={contact?.in_app_enabled ?? true} name="in_app_enabled" type="checkbox" />
          In-App Meldungen
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input defaultChecked={contact?.telegram_enabled ?? false} name="telegram_enabled" type="checkbox" />
          Telegram aktivieren
        </label>
        <Button className="sm:col-span-2" type="submit">Kontakte speichern</Button>
      </form>
      {contact?.telegram_chat_id ? (
        <form action={sendTelegramTestAction} className="mt-3">
          <input name="telegram_chat_id" type="hidden" value={contact.telegram_chat_id} />
          <Button variant="secondary" type="submit">Telegram Test senden</Button>
        </form>
      ) : null}
      <WebPushPanel gardenId={gardenId} publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? ""} />
    </section>
  );
}

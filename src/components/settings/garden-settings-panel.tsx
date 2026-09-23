import { updateProfileAction } from "@/lib/profiles/actions";
import { updateGardenAction, updateChatSettingsAction, updateWeatherSettingsAction, leaveGardenAction, deleteGardenAction } from "@/lib/gardens/settings-actions";
import type { Garden, GardenRole, Profile } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";

export function GardenSettingsPanel({
  garden,
  profile,
  userRole,
}: {
  garden: Garden;
  profile: Profile | null;
  userRole: GardenRole;
}) {
  return (
    <>
      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        {userRole === "owner" || userRole === "admin" ? (
        <ActionForm action={updateGardenAction} className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]">
          <h2 className="text-lg font-bold">Gartenname</h2>
          <input name="garden_id" type="hidden" value={garden.id} />
          <label className="mt-4 block text-sm font-semibold">
            Name
            <input className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3" name="name" defaultValue={garden.name} required />
          </label>
          <Button className="mt-3" type="submit">Garten speichern</Button>
        </ActionForm>
        ) : null}
        <ActionForm action={updateProfileAction} className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]">
          <h2 className="text-lg font-bold">Mein Anzeigename</h2>
          <label className="mt-4 block text-sm font-semibold">
            Name
            <input className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3" name="display_name" defaultValue={profile?.display_name ?? ""} required />
          </label>
          <Button className="mt-3" type="submit">Namen speichern</Button>
        </ActionForm>
      </section>
      {(userRole === "owner" || userRole === "admin") && (
        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <ActionForm action={updateChatSettingsAction} className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]">
            <h2 className="text-lg font-bold">Chat-Einstellungen</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-4 block text-sm font-semibold">
              Nachrichten automatisch löschen nach
              <select
                className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3 bg-white"
                name="chat_retention_days"
                defaultValue={String(garden.chat_retention_days)}
              >
                <option value="30">30 Tagen</option>
                <option value="60">60 Tagen</option>
                <option value="90">90 Tagen</option>
                <option value="180">180 Tagen</option>
                <option value="365">1 Jahr</option>
                <option value="0">Nie löschen</option>
              </select>
            </label>
            <Button className="mt-3" type="submit">Chat-Einstellungen speichern</Button>
          </ActionForm>
          <ActionForm action={updateWeatherSettingsAction} className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]">
            <h2 className="text-lg font-bold">Wetter</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-4 block text-sm font-semibold">
              WetterOnline-Ort
              <input
                className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3"
                name="weather_location"
                defaultValue={garden.weather_location ?? ""}
                placeholder="z. B. Berlin oder wetter/berlin"
              />
            </label>
            <Button className="mt-3" type="submit">Wetter speichern</Button>
          </ActionForm>
        </section>
      )}
      <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-bold text-red-800">Gefahrenzone</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ActionForm action={leaveGardenAction} className="space-y-2">
            <input name="garden_id" type="hidden" value={garden.id} />
            <p className="text-sm text-red-800">
              Du wirst als ausgezogen gefuehrt, deine offenen Dienste werden frei. Bis zum Abschluss bleibst du in der Abrechnung.
            </p>
            <Button type="submit" variant="secondary">Garten verlassen</Button>
          </ActionForm>
          {userRole === "owner" || userRole === "admin" ? (
            <ActionForm action={deleteGardenAction} className="space-y-2">
              <input name="garden_id" type="hidden" value={garden.id} />
              <p className="text-sm text-red-800">
                Loescht alle Aufgaben, Mitglieder, Chats und Abrechnungen endgueltig. Das kann nicht rueckgaengig gemacht werden.
              </p>
              <label className="block text-sm font-semibold text-red-800">
                Zur Bestaetigung LOESCHEN eintippen
                <input autoComplete="off" className="mt-1 w-full rounded-xl border border-red-300 bg-white px-3 py-3" name="confirm" required />
              </label>
              <Button type="submit" variant="danger">Garten loeschen</Button>
            </ActionForm>
          ) : null}
        </div>
      </section>
    </>
  );
}

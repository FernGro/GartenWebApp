import { updateProfileAction } from "@/lib/profiles/actions";
import { updateGardenAction, updateChatSettingsAction, updateWeatherSettingsAction, leaveGardenAction, deleteGardenAction } from "@/lib/gardens/settings-actions";
import type { Garden, GardenRole, Profile } from "@/types/domain";
import { Button } from "@/components/ui/button";

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
        <form action={updateGardenAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <h2 className="text-lg font-bold">Gartenname</h2>
          <input name="garden_id" type="hidden" value={garden.id} />
          <label className="mt-4 block text-sm font-semibold">
            Name
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="name" defaultValue={garden.name} required />
          </label>
          <Button className="mt-3" type="submit">Garten speichern</Button>
        </form>
        <form action={updateProfileAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <h2 className="text-lg font-bold">Mein Anzeigename</h2>
          <label className="mt-4 block text-sm font-semibold">
            Name
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="display_name" defaultValue={profile?.display_name ?? ""} required />
          </label>
          <Button className="mt-3" type="submit">Namen speichern</Button>
        </form>
      </section>
      {(userRole === "owner" || userRole === "admin") && (
        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <form action={updateChatSettingsAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Chat-Einstellungen</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-4 block text-sm font-semibold">
              Nachrichten automatisch löschen nach
              <select
                className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3 bg-white"
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
          </form>
          <form action={updateWeatherSettingsAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Wetter</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-4 block text-sm font-semibold">
              WetterOnline-Ort
              <input
                className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3"
                name="weather_location"
                defaultValue={garden.weather_location ?? ""}
                placeholder="z. B. Berlin oder wetter/berlin"
              />
            </label>
            <Button className="mt-3" type="submit">Wetter speichern</Button>
          </form>
        </section>
      )}
      <section className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-bold text-red-800">Gefahrenzone</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <form action={leaveGardenAction}>
            <input name="garden_id" type="hidden" value={garden.id} />
            <button
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              type="submit"
            >
              Garten verlassen
            </button>
          </form>
          {userRole === "owner" && (
            <form action={deleteGardenAction}>
              <input name="garden_id" type="hidden" value={garden.id} />
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                type="submit"
              >
                Garten loeschen
              </button>
            </form>
          )}
        </div>
        <p className="mt-3 text-xs text-red-600">
          {userRole === "owner"
            ? "Beim Loeschen werden alle Aufgaben, Mitglieder und Daten dauerhaft entfernt. Das kann nicht rueckgaengig gemacht werden."
            : "Du verlaessl den Garten dauerhaft. Der letzte Owner kann den Garten nicht verlassen."}
        </p>
      </section>
    </>
  );
}

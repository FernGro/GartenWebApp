import { updateProfileAction } from "@/lib/profiles/actions";
import { updateGardenAction } from "@/lib/gardens/settings-actions";
import type { Garden, Profile } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function GardenSettingsPanel({
  garden,
  profile,
}: {
  garden: Garden;
  profile: Profile | null;
}) {
  return (
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
  );
}

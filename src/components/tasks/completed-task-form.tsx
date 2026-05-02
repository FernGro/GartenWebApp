import { createCompletedTaskAction } from "@/lib/tasks/actions";
import type { GardenMember } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function CompletedTaskForm({
  gardenId,
  members,
  canManage,
}: {
  gardenId: string;
  members: GardenMember[];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  return (
    <form action={createCompletedTaskAction} className="mt-6 space-y-4 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <input name="garden_id" type="hidden" value={gardenId} />
      <div>
        <h2 className="text-lg font-bold">Erledigte Aufgabe nachtragen</h2>
        <p className="mt-1 text-sm text-[#5a6655]">Fuer Faelle wie: Thomas hat schon zweimal Rasen gemaeht.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Titel
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="title" placeholder="Rasenmaehen" required />
        </label>
        <label className="text-sm font-semibold">
          Erledigt von
          <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="completed_by" required>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.profiles?.display_name ?? "Mitglied"}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Erledigt am
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="completed_on" required type="date" />
        </label>
        <label className="text-sm font-semibold">
          Punkte
          <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="points" defaultValue="4">
            {[1, 2, 3, 4, 5].map((point) => (
              <option key={point} value={point}>{point}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Notiz
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="description" />
      </label>
      <Button type="submit">Erledigung nachtragen</Button>
    </form>
  );
}

import { createTaskAction } from "@/lib/tasks/actions";
import type { AvailabilityWindow, GardenMember, ScoreRow, TaskTemplate } from "@/types/domain";
import { suggestAssignee } from "@/lib/planning/fairness";
import { Button } from "@/components/ui/button";

export function TaskForm({
  gardenId,
  members,
  scores,
  templates,
  availability,
}: {
  gardenId: string;
  members: GardenMember[];
  scores: ScoreRow[];
  templates: TaskTemplate[];
  availability: AvailabilityWindow[];
}) {
  const suggested = suggestAssignee(scores, null, availability);

  return (
    <form action={createTaskAction} className="space-y-4 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <input name="garden_id" type="hidden" value={gardenId} />
      <div>
        <label className="text-sm font-semibold" htmlFor="template_hint">
          Vorlage
        </label>
        <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" id="template_hint" name="template_hint">
          <option value="">Manuelle Aufgabe</option>
          {templates.map((template) => (
            <option key={template.id} value={template.title}>
              {template.title} ({template.default_points} Punkte)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="title">
          Titel
        </label>
        <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="title" name="title" required />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="description">
          Beschreibung
        </label>
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="description" name="description" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-semibold" htmlFor="points">
            Punkte
          </label>
          <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" id="points" name="points" defaultValue="2">
            {[1, 2, 3, 4, 5].map((point) => (
              <option key={point} value={point}>
                {point}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="due_date">
            Faellig am
          </label>
          <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" id="due_date" name="due_date" type="date" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="assigned_to">
            Zuweisung
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3"
            defaultValue={suggested?.userId ?? ""}
            id="assigned_to"
            name="assigned_to"
          >
            <option value="">Automatisch vorschlagen</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profiles?.display_name ?? "Mitglied"}
              </option>
            ))}
          </select>
        </div>
      </div>
      {suggested ? (
        <p className="rounded-lg bg-[#e7efe1] px-3 py-2 text-sm text-[#2f6b3f]">
          Fairness-Vorschlag: {suggested.displayName} mit {suggested.points} Punkten. Bei leerer Zuweisung wird serverseitig automatisch vorgeschlagen.
        </p>
      ) : null}
      <Button className="w-full sm:w-auto" type="submit">
        Aufgabe erstellen
      </Button>
    </form>
  );
}

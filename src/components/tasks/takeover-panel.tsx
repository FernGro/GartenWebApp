import { decideTakeoverAction } from "@/lib/tasks/actions";
import { formatDateTime } from "@/lib/format/date";
import type { TaskTakeoverRequest } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function TakeoverPanel({
  requests,
  currentUserId,
  canManage,
}: {
  requests: TaskTakeoverRequest[];
  currentUserId?: string;
  canManage: boolean;
}) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <h2 className="text-lg font-bold">Offene Uebernahmen</h2>
      <div className="mt-3 space-y-3">
        {requests.map((request) => {
          const mayDecide = canManage || request.current_assignee === currentUserId;

          return (
            <article className="rounded-lg bg-[#f2f7ec] p-3" key={request.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {request.requested_profile?.display_name ?? "Mitglied"} moechte uebernehmen
                  </div>
                  <div className="text-xs text-[#6d7669]">{formatDateTime(request.created_at)}</div>
                  {request.note ? <p className="mt-1 text-sm text-[#42513d]">{request.note}</p> : null}
                </div>
                {mayDecide ? (
                  <div className="flex gap-2">
                    <form action={decideTakeoverAction}>
                      <input name="request_id" type="hidden" value={request.id} />
                      <input name="task_id" type="hidden" value={request.task_id} />
                      <input name="garden_id" type="hidden" value={request.garden_id} />
                      <input name="requested_by" type="hidden" value={request.requested_by} />
                      <input name="current_assignee" type="hidden" value={request.current_assignee ?? ""} />
                      <input name="decision" type="hidden" value="approved" />
                      <Button type="submit">Bestaetigen</Button>
                    </form>
                    <form action={decideTakeoverAction}>
                      <input name="request_id" type="hidden" value={request.id} />
                      <input name="task_id" type="hidden" value={request.task_id} />
                      <input name="garden_id" type="hidden" value={request.garden_id} />
                      <input name="requested_by" type="hidden" value={request.requested_by} />
                      <input name="current_assignee" type="hidden" value={request.current_assignee ?? ""} />
                      <input name="decision" type="hidden" value="rejected" />
                      <Button variant="secondary" type="submit">Ablehnen</Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

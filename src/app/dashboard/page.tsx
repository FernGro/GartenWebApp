import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { OwnerRecovery } from "@/components/dashboard/owner-recovery";
import { ScorePie } from "@/components/dashboard/score-pie";
import { ScoreRace } from "@/components/dashboard/score-race";
import { ScoreTable } from "@/components/dashboard/score-table";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SupabaseSetupWarning } from "@/components/ui/setup-warning";
import { todayIsoDate } from "@/lib/format/date";
import { createGardenAction } from "@/lib/gardens/actions";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";
import { triggerTaskChatAutomationAction } from "@/lib/tasks/reminder-actions";

export const dynamic = "force-dynamic";

type DashboardFilter = "open" | "mine" | "review" | "overdue" | "done";

const filterLabels: Record<DashboardFilter, string> = {
  open: "Offene Aufgaben",
  mine: "Meine Aufgaben",
  review: "Erledigungen in Pruefung",
  overdue: "Ueberfaellige Aufgaben",
  done: "Erledigte Aufgaben",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const activeFilter: DashboardFilter = ["open", "mine", "review", "overdue", "done"].includes(params.view ?? "")
    ? params.view as DashboardFilter
    : "open";
  const supabase = await createClient();

  if (!supabase) {
    return (
      <AppShell>
        <SupabaseSetupWarning />
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell>
        <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-6">
          <h1 className="text-2xl font-bold">Bitte einloggen</h1>
          <Link className="mt-4 inline-flex rounded-lg bg-[#2f6b3f] px-4 py-3 font-semibold text-white" href="/login">
            Zur Login-Seite
          </Link>
        </div>
      </AppShell>
    );
  }

  const garden = await getCurrentGarden(supabase);

  if (!garden) {
    return (
      <AppShell>
        <div className="max-w-xl rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-sm shadow-[#4a5d3f]/5">
          <h1 className="text-2xl font-bold">Garten beitreten oder anlegen</h1>
          <p className="mt-2 text-sm leading-6 text-[#5a6655]">
            Wenn du eingeladen wurdest, oeffne den Einladungslink, den der Owner unter Mitglieder erstellt hat.
            Nur wenn du einen eigenen neuen Haushalt starten willst, lege hier einen neuen Garten an.
          </p>
          <form action={createGardenAction} className="mt-5 space-y-4">
            <input className="w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="name" placeholder="z. B. Garten Haus 12" required />
            <Button type="submit">Garten erstellen</Button>
          </form>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#2f6b3f] underline" href="/install">
            App auf dem Handy speichern
          </Link>
        </div>
      </AppShell>
    );
  }

  const [members, allMembers, tasks, role] = await Promise.all([
    getGardenMembers(supabase, garden.id),
    getGardenMembers(supabase, garden.id, true),
    getTasks(supabase, garden.id),
    getUserGardenRole(supabase, garden.id, user.id),
  ]);
  const canManage = canManageGarden(role);
  const scores = calculateScores(tasks, members);
  const suggestion = suggestAssignee(scores, null);
  const openTasks = tasks.filter((task) => task.status === "open" || task.status === "assigned" || task.status === "overdue" || task.status === "postponed");
  const pendingReviewTasks = tasks.filter((task) => task.status === "pending_review");
  const myTasks = openTasks.filter((task) => task.assigned_to === user.id);
  const today = todayIsoDate();
  const overdueTasks = openTasks.filter((task) => task.status === "overdue" || (task.due_date && task.due_date < today));
  const doneTasks = tasks.filter((task) => task.status === "done");
  const taskBuckets: Record<DashboardFilter, typeof tasks> = {
    open: openTasks,
    mine: myTasks,
    review: pendingReviewTasks,
    overdue: overdueTasks,
    done: doneTasks,
  };
  const selectedTasks = taskBuckets[activeFilter];
  const nextTriggerTasks = [...openTasks]
    .filter((task) => task.assigned_to)
    .sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"))
    .slice(0, 2);

  return (
    <AppShell>
      <OwnerRecovery gardenId={garden.id} members={allMembers} currentUserId={user.id} createdBy={garden.created_by} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Link href="/tasks/new">
          <Button>Neue Aufgabe</Button>
        </Link>
      </div>
      <section className="grid gap-3 sm:grid-cols-5">
        {[
          ["open", "Offen", openTasks.length],
          ["mine", "Meine", myTasks.length],
          ["review", "Pruefung", pendingReviewTasks.length],
          ["overdue", "Ueberfaellig", overdueTasks.length],
          ["done", "Erledigt", doneTasks.length],
        ].map(([filter, label, value]) => (
          <Link
            className={`rounded-lg border p-4 shadow-sm shadow-[#4a5d3f]/5 transition hover:border-[#8fb36b] hover:bg-[#f8faf3] ${
              activeFilter === filter ? "border-[#2f6b3f] bg-[#eef6e8]" : "border-[#d7dfcf] bg-[#fffef9]"
            }`}
            href={`/dashboard?view=${filter}`}
            key={filter}
          >
            <div className="text-sm text-[#5a6655]">{label}</div>
            <div className="mt-2 text-3xl font-bold text-[#172016]">{value}</div>
          </Link>
        ))}
      </section>
      {canManage && nextTriggerTasks.length > 0 ? (
        <section className="mt-6 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Chat-Test fuer Owner/Admin</h2>
              <p className="text-sm text-[#5a6655]">Prueft die naechsten zwei Dienste und schreibt je nach Status eine Erinnerung oder einen Uebernahme-Aufruf in den Chat.</p>
            </div>
            <Link className="text-sm font-semibold text-[#2f6b3f]" href="/chat">Zum Chat</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {nextTriggerTasks.map((task) => (
              <form action={triggerTaskChatAutomationAction} className="rounded-lg bg-[#f8faf3] p-3" key={task.id}>
                <input name="task_id" type="hidden" value={task.id} />
                <input name="garden_id" type="hidden" value={task.garden_id} />
                <div className="text-sm font-semibold text-[#172016]">{task.title}</div>
                <div className="mt-1 text-xs text-[#6d7669]">{task.due_date ? `Faellig ${task.due_date}` : "Ohne Faelligkeit"}</div>
                <Button className="mt-3 w-full" variant="secondary" type="submit">Chat-Check ausloesen</Button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">{filterLabels[activeFilter]}</h2>
            <Link className="text-sm font-semibold text-[#2f6b3f]" href="/tasks">
              Alle ansehen
            </Link>
          </div>
          <div className="space-y-3">
            {selectedTasks.slice(0, 8).map((task) => (
              <TaskCard compact key={task.id} task={task} currentUserId={user.id} canManage={canManage} />
            ))}
            {selectedTasks.length === 0 ? (
              <EmptyState title="Keine Aufgaben">In dieser Ansicht gibt es aktuell nichts.</EmptyState>
            ) : null}
            {selectedTasks.length > 8 ? <div className="text-sm text-[#5a6655]">+{selectedTasks.length - 8} weitere in Aufgaben</div> : null}
          </div>
        </div>
        <aside>
          <h2 className="mb-3 text-xl font-bold">Punkte</h2>
          <ScoreTable scores={scores} />
          <div className="mt-3">
            <ScorePie scores={scores} />
          </div>
          <div className="mt-3">
            <ScoreRace scores={scores} />
          </div>
          {suggestion ? (
            <p className="mt-3 rounded-lg bg-[#e7efe1] px-4 py-3 text-sm text-[#2f6b3f]">
              Fairness-Hinweis: {suggestion.displayName} hat aktuell den niedrigsten Stand.
            </p>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}

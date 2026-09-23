import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { OwnerRecovery } from "@/components/dashboard/owner-recovery";
import { ScoreRace } from "@/components/dashboard/score-race";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { SupabaseSetupWarning } from "@/components/ui/setup-warning";
import { formatDate, todayIsoDate } from "@/lib/format/date";
import { createGardenAction } from "@/lib/gardens/actions";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";
import { triggerTaskChatAutomationAction } from "@/lib/tasks/reminder-actions";

export const dynamic = "force-dynamic";

type DashboardFilter = "open" | "mine" | "overdue" | "done";

const filterLabels: Record<DashboardFilter, string> = {
  open: "Offene Aufgaben",
  mine: "Meine Aufgaben",
  overdue: "Ueberfaellige Aufgaben",
  done: "Erledigte Aufgaben",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const activeFilter: DashboardFilter = ["open", "mine", "overdue", "done"].includes(params.view ?? "")
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
        <div className="max-w-xl rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-[0_2px_0_#d7dfcf]">
          <h1 className="text-2xl font-bold">Garten beitreten oder anlegen</h1>
          <p className="mt-2 text-sm leading-6 text-[#5a6655]">
            Wenn du eingeladen wurdest, oeffne den Einladungslink, den der Owner unter Mitglieder erstellt hat.
            Nur wenn du einen eigenen neuen Haushalt starten willst, lege hier einen neuen Garten an.
          </p>
          <form action={createGardenAction} className="mt-5 space-y-4">
            <input className="w-full rounded-xl border border-[#cbd8c1] px-3 py-3" name="name" placeholder="z. B. Garten Haus 12" required />
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
  const suggestion = suggestAssignee(calculateScores(tasks, members, allMembers), null);
  const openTasks = tasks.filter((task) => task.status === "open" || task.status === "assigned" || task.status === "overdue" || task.status === "postponed");
  const myTasks = openTasks.filter((task) => task.assigned_to === user.id);
  const today = todayIsoDate();
  const overdueTasks = openTasks.filter((task) => task.status === "overdue" || (task.due_date && task.due_date < today));
  const doneTasks = tasks.filter((task) => task.status === "done");
  const taskBuckets: Record<DashboardFilter, typeof tasks> = {
    open: openTasks,
    mine: myTasks,
    overdue: overdueTasks,
    done: doneTasks,
  };
  const selectedTasks = taskBuckets[activeFilter];
  const nextTriggerTasks = [...openTasks]
    .filter((task) => task.assigned_to)
    .sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"))
    .slice(0, 2);
  const myName = members.find((member) => member.user_id === user.id)?.profiles?.display_name?.trim();
  const nextMine = [...myTasks].sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"))[0];
  const filters: [DashboardFilter, string, number][] = [
    ["open", "Offen", openTasks.length],
    ["mine", "Meine", myTasks.length],
    ["overdue", "Ueberfaellig", overdueTasks.length],
    ["done", "Erledigt", doneTasks.length],
  ];

  return (
    <AppShell>
      <OwnerRecovery gardenId={garden.id} members={allMembers} currentUserId={user.id} createdBy={garden.created_by} />
      <section className="relative overflow-hidden rounded-3xl bg-[#2f6b3f] px-5 pb-5 pt-6 text-white shadow-[0_3px_0_#1f4a2b] sm:px-7">
        <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_56px,transparent_56px_112px)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold sm:text-4xl">{myName ? `Hallo ${myName}` : "Hallo"}</h1>
          <p className="mt-1 max-w-xl text-[#dcebcf]">
            {myTasks.length === 0
              ? "Du hast gerade keinen Dienst. Geniess den Garten."
              : myTasks.length === 1
                ? "Du hast einen offenen Dienst."
                : `Du hast ${myTasks.length} offene Dienste. Das ist der naechste:`}
          </p>
          {nextMine ? (
            <div className="mt-4 text-[#172016]">
              <TaskCard currentUserId={user.id} canManage={canManage} task={nextMine} />
            </div>
          ) : (
            <Link className={buttonClass("secondary", "mt-4")} href="/tasks">
              Offene Aufgaben ansehen
            </Link>
          )}
          {overdueTasks.length > 0 ? (
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff7e8] px-3 py-1.5 text-sm font-semibold text-[#6f4d16] hover:bg-white"
              href="/dashboard?view=overdue"
            >
              {overdueTasks.length} {overdueTasks.length === 1 ? "Dienst ist" : "Dienste sind"} ueberfaellig und {overdueTasks.length === 1 ? "sucht" : "suchen"} Hilfe
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">{filterLabels[activeFilter]}</h2>
            <Link className="text-sm font-semibold text-[#2f6b3f] hover:underline" href="/tasks">
              Alle Aufgaben
            </Link>
          </div>
          <nav aria-label="Aufgaben filtern" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-[#e7efe1] p-1">
            {filters.map(([filter, label, value]) => (
              <Link
                aria-current={activeFilter === filter ? "page" : undefined}
                className={`press flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                  activeFilter === filter ? "bg-[#fffef9] text-[#172016] shadow-[0_1px_0_#d7dfcf]" : "text-[#405039] hover:bg-[#f8faf3]/70"
                }`}
                href={`/dashboard?view=${filter}`}
                key={filter}
              >
                {label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    filter === "overdue" && value > 0 ? "bg-[#efc071] text-[#6f4d16]" : "bg-[#d7dfcf]/70 text-[#405039]"
                  }`}
                >
                  {value}
                </span>
              </Link>
            ))}
          </nav>
          <div className="space-y-3">
            {selectedTasks.slice(0, 8).map((task) => (
              <TaskCard compact key={task.id} task={task} currentUserId={user.id} canManage={canManage} />
            ))}
            {selectedTasks.length === 0 ? (
              <EmptyState title="Hier ist gerade nichts">
                {activeFilter === "overdue" ? "Nichts ist ueberfaellig. Stark!" : "In dieser Ansicht gibt es keine Aufgaben."}
              </EmptyState>
            ) : null}
            {selectedTasks.length > 8 ? (
              <Link className="block text-sm font-semibold text-[#2f6b3f] hover:underline" href="/tasks">
                {selectedTasks.length - 8} weitere in Aufgaben ansehen
              </Link>
            ) : null}
          </div>
        </div>
        <aside className="space-y-4">
          <ScoreRace currentUserId={user.id} fairnessName={suggestion?.displayName ?? null} scores={scores} />
          {canManage && nextTriggerTasks.length > 0 ? (
            <details className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4">
              <summary className="cursor-pointer font-semibold text-[#405039]">Chat-Erinnerung testen</summary>
              <p className="mt-2 text-sm text-[#5a6655]">
                Schreibt fuer die naechsten Dienste je nach Status eine Erinnerung oder einen Uebernahme-Aufruf in den Chat.
              </p>
              <div className="mt-3 space-y-2">
                {nextTriggerTasks.map((task) => (
                  <form action={triggerTaskChatAutomationAction} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8faf3] p-3" key={task.id}>
                    <input name="task_id" type="hidden" value={task.id} />
                    <input name="garden_id" type="hidden" value={task.garden_id} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#172016]">{task.title}</div>
                      <div className="text-xs text-[#6d7669]">{task.due_date ? `Faellig ${formatDate(task.due_date)}` : "Ohne Faelligkeit"}</div>
                    </div>
                    <Button variant="secondary" type="submit">Testen</Button>
                  </form>
                ))}
              </div>
            </details>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}

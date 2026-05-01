import type { TaskStatus } from "@/types/domain";

const labels: Record<TaskStatus, string> = {
  open: "Offen",
  assigned: "Zugewiesen",
  done: "Erledigt",
  overdue: "Ueberfaellig",
  cancelled: "Abgebrochen",
  postponed: "Verschoben",
};

const styles: Record<TaskStatus, string> = {
  open: "bg-[#fffef9] text-[#42513d] ring-[#d7dfcf]",
  assigned: "bg-[#e7efe1] text-[#2f6b3f] ring-[#b9d1b0]",
  done: "bg-[#dff5e7] text-[#17653a] ring-[#9ad2ae]",
  overdue: "bg-[#fff0d9] text-[#915b10] ring-[#efc071]",
  cancelled: "bg-[#f3e2df] text-[#8a2f25] ring-[#d9aaa3]",
  postponed: "bg-[#e7ebf6] text-[#304c89] ring-[#b5c1df]",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

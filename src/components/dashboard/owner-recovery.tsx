import { restoreOwnerAction } from "@/lib/gardens/member-actions";
import type { GardenMember } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function OwnerRecovery({
  gardenId,
  members,
  currentUserId,
  createdBy,
}: {
  gardenId: string;
  members: GardenMember[];
  currentUserId: string;
  createdBy: string | null;
}) {
  const hasOwner = members.some((member) => member.is_active && member.role === "owner");
  const canRestore = !hasOwner && createdBy === currentUserId;

  if (!canRestore) {
    return null;
  }

  return (
    <section className="mb-6 rounded-lg border border-[#efc071] bg-[#fff7e8] p-4 text-[#6f4d16]">
      <h2 className="text-lg font-bold">Owner-Rolle wiederherstellen</h2>
      <p className="mt-2 text-sm leading-6">
        In diesem Garten gibt es aktuell keinen aktiven Owner. Da du den Garten erstellt hast, kannst du dich wieder als Owner eintragen.
      </p>
      <form action={restoreOwnerAction} className="mt-3">
        <input name="garden_id" type="hidden" value={gardenId} />
        <Button type="submit">Mich wieder zum Owner machen</Button>
      </form>
    </section>
  );
}

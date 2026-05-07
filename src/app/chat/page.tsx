import { AppShell } from "@/components/layout/app-shell";
import { ChatView } from "@/components/chat/chat-view";
import { EmptyState } from "@/components/ui/empty-state";
import { getChatMessages } from "@/lib/chat/queries";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!garden || !user) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst einen Garten im Dashboard an.</EmptyState>
      </AppShell>
    );
  }

  const [messages, members] = supabase
    ? await Promise.all([
        getChatMessages(supabase, garden.id),
        getGardenMembers(supabase, garden.id),
      ])
    : [[], []];

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Chat</h1>
        <p className="mt-1 text-sm text-[#5a6655]">Nachrichten für alle Garten-Mitglieder</p>
      </div>
      <ChatView
        gardenId={garden.id}
        currentUserId={user.id}
        initialMessages={messages}
        members={members}
      />
    </AppShell>
  );
}

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/gardens/invite-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <AppShell>
      <div className="max-w-xl rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-sm shadow-[#4a5d3f]/5">
        <h1 className="text-2xl font-bold">Garten-Einladung</h1>
        <p className="mt-2 text-sm text-[#5a6655]">
          Melde dich an und nimm die Einladung an. Der Link wird serverseitig geprueft und kann abgelaufen sein.
        </p>
        {user ? (
          <form action={acceptInviteAction} className="mt-5">
            <input name="token" type="hidden" value={token} />
            <Button type="submit">Einladung annehmen</Button>
          </form>
        ) : (
          <Link className="mt-5 inline-flex rounded-lg bg-[#2f6b3f] px-4 py-3 font-semibold text-white" href={`/login?next=/invite/${token}`}>
            Erst einloggen
          </Link>
        )}
      </div>
    </AppShell>
  );
}

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
          Das ist der Link, der deinen Account mit dem bestehenden Garten verbindet. Ohne diesen Schritt siehst du nur die Option,
          einen eigenen neuen Garten zu erstellen.
        </p>
        {user ? (
          <form action={acceptInviteAction} className="mt-5">
            <input name="token" type="hidden" value={token} />
            <Button type="submit">Einladung annehmen</Button>
          </form>
        ) : (
          <div className="mt-5 rounded-lg bg-[#f2f7ec] p-4">
            <p className="text-sm text-[#42513d]">Melde dich erst an. Danach kommst du automatisch hierher zurueck.</p>
            <Link className="mt-3 inline-flex rounded-lg bg-[#2f6b3f] px-4 py-3 font-semibold text-white" href={`/login?next=/invite/${token}`}>
              Einloggen und Einladung annehmen
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

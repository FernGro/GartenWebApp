import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-styles";
import { acceptInviteAction } from "@/lib/gardens/invite-actions";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ui/action-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <AppShell>
      <div className="max-w-xl rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-5 shadow-[0_2px_0_#d7dfcf]">
        <h1 className="text-2xl font-bold">Garten-Einladung</h1>
        <p className="mt-2 text-sm text-[#5a6655]">
          Das ist der Link, der deinen Account mit dem bestehenden Garten verbindet. Ohne diesen Schritt siehst du nur die Option,
          einen eigenen neuen Garten zu erstellen.
        </p>
        {user ? (
          <ActionForm action={acceptInviteAction} className="mt-5">
            <input name="token" type="hidden" value={token} />
            <Button type="submit">Einladung annehmen</Button>
          </ActionForm>
        ) : (
          <div className="mt-5 rounded-xl bg-[#f2f7ec] p-4">
            <p className="text-sm text-[#42513d]">
              Melde dich zuerst an, danach kommst du automatisch hierher zurueck. Am einfachsten geht es per Magic-Link:
              E-Mail eingeben, Link aus der Mail oeffnen, fertig. Das klappt auch ohne bestehendes Konto und ohne Passwort.
            </p>
            <Link className={buttonClass("primary", "mt-3")} href={`/login?next=/invite/${token}`}>
              Anmelden und Einladung annehmen
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { AccountPanel } from "@/components/account/account-panel";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass } from "@/components/ui/button-styles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Mein Konto</h1>
        <p className="mt-1 text-[#5a6655]">Passwort und E-Mail-Adresse fuer die Anmeldung.</p>
      </div>
      {user?.email ? (
        <AccountPanel email={user.email} recovery={reset === "1"} />
      ) : (
        <div className="rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-5">
          <p className="text-[#405039]">Bitte melde dich zuerst an.</p>
          <Link className={buttonClass("primary", "mt-3")} href="/login?next=/konto">Anmelden</Link>
        </div>
      )}
    </AppShell>
  );
}

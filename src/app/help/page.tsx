import { HelpBrowser } from "@/components/help/help-browser";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const garden = supabase && user ? await getCurrentGarden(supabase) : null;
  const role = supabase && garden && user ? await getUserGardenRole(supabase, garden.id, user.id) : null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Hilfe</h1>
        <p className="mt-2 max-w-2xl text-[#5a6655]">
          Alles, was du in der App machen kannst, Schritt fuer Schritt. Suche nach einem Stichwort oder waehle ein Thema.
        </p>
      </div>
      <HelpBrowser initialRole={role ?? "member"} />
    </AppShell>
  );
}

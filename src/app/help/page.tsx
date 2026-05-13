import { HelpBrowser } from "@/components/help/help-browser";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">Bedienung</p>
        <h1 className="text-3xl font-bold">Hilfe</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5a6655]">
          Funktionen nach Rolle, Ort in der App und typischem Ablauf. Neue Features werden hier mitgefuehrt.
        </p>
      </div>
      <HelpBrowser />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/app-shell";

export default function InstallPage() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-[#2f6b3f]">Handy & Desktop</p>
        <h1 className="mt-2 text-3xl font-bold">App auf dem Startbildschirm speichern</h1>
        <p className="mt-3 text-sm leading-6 text-[#5a6655]">
          Ein Link darf aus Sicherheitsgruenden nicht automatisch ungefragt eine App oder Verknuepfung installieren.
          Du kannst die Webseite aber wie eine App auf dem Handy speichern.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <h2 className="text-lg font-bold">iPhone / iPad</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-[#42513d]">
            <li>1. Webseite in Safari oeffnen.</li>
            <li>2. Teilen-Symbol antippen.</li>
            <li>3. Zum Home-Bildschirm auswaehlen.</li>
            <li>4. Hinzufuegen antippen.</li>
          </ol>
        </section>

        <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <h2 className="text-lg font-bold">Android</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-[#42513d]">
            <li>1. Webseite in Chrome oeffnen.</li>
            <li>2. Menue mit drei Punkten oeffnen.</li>
            <li>3. App installieren oder Zum Startbildschirm auswaehlen.</li>
            <li>4. Bestaetigen.</li>
          </ol>
        </section>

        <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <h2 className="text-lg font-bold">Desktop</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-[#42513d]">
            <li>1. Webseite in Chrome oder Edge oeffnen.</li>
            <li>2. Installieren-Symbol in der Adressleiste suchen.</li>
            <li>3. Installieren bestaetigen.</li>
          </ol>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Serdar zum bestehenden Garten einladen</h2>
        <p className="mt-2 text-sm leading-6 text-[#42513d]">
          Oeffne als Owner die Seite Mitglieder, erstelle einen Invite-Link und schicke genau diesen Link an Serdar.
          Serdar muss den Link oeffnen, sich anmelden und Einladung annehmen klicken. Danach erscheint dein Garten bei ihm.
        </p>
      </section>
    </AppShell>
  );
}

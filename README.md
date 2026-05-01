# Garten Dienstplan

MVP fuer eine Garten-Dienstplan-Web-App mit Next.js App Router, TypeScript, Tailwind CSS und Supabase.

## Funktionsumfang

- Supabase Auth mit Magic-Link, Passwort-Login und Registrierung
- Garten-Onboarding fuer den ersten Haushalt
- Aufgaben anlegen, zuweisen und als erledigt markieren
- Punkteuebersicht aus erledigten Aufgaben, ohne gespeicherte Gesamtsummen
- Fairness-Vorschlag nach niedrigsten Punkten und aeltestem letztem Dienst
- Task-Icons fuer typische Gartenarbeiten
- Kommentare und Event-Verlauf auf der Task-Detailseite
- Abwesenheiten/Beschaeftigt-Zeiten mit Kalenderuebersicht
- Mitgliederverwaltung mit Invite-Links
- Lesbare In-App Notifications
- Saisonaufgaben aus Templates erzeugen
- Row Level Security fuer Garten-Mitgliedschaft

## Lokales Setup

1. Dependencies installieren:

```bash
npm install
```

2. Supabase-Projekt anlegen und die Migration ausfuehren:

```bash
supabase db push
supabase db reset
```

Alternativ kann `supabase/migrations/001_initial_schema.sql` im Supabase SQL Editor ausgefuehrt werden. Danach optional `supabase/seed.sql` fuer Standardvorlagen ausfuehren.

3. `.env.local` anlegen:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. App starten:

```bash
npm run dev
```

Die App laeuft standardmaessig unter `http://localhost:3000`.

## Supabase Auth

Im Supabase Dashboard sollten Email Auth und je nach Wunsch Magic Links oder Passwort-Login aktiviert sein. Fuer Magic Links muss die Redirect URL erlaubt sein:

```text
http://localhost:3000/auth/callback
```

Fuer Vercel spaeter entsprechend:

```text
https://deine-domain.vercel.app/auth/callback
```

## Vercel Deployment

1. Repository mit Vercel verbinden.
2. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Build Command: `npm run build`
4. Output wird durch Next.js automatisch verwaltet.
5. In Supabase die Vercel Callback URL fuer Auth ergaenzen.

Keine Service-Role Keys im Frontend oder in Vercel Public Env Vars speichern.

Eine ausfuehrliche Schritt-fuer-Schritt-Anleitung fuer Nicht-Entwickler steht in [docs/beginner-deployment.md](docs/beginner-deployment.md).

## Projektstruktur

```text
src/
  app/                  App Router Seiten und Route Handler
  components/           UI-, Layout-, Dashboard- und Task-Komponenten
  lib/                  Supabase, Auth, Datenzugriff, Domain-Logik
  types/                Domain- und Datenbanktypen
supabase/
  migrations/           SQL Schema inklusive RLS
  seed.sql              Standard-Aufgabenvorlagen
docs/                   Architektur- und Betriebsdokumentation
```

## Updates und spaetere Features

Empfohlener Workflow:

1. Code in GitHub pushen.
2. Vercel mit dem GitHub-Repository verbinden.
3. Neue Features lokal entwickeln und committen.
4. Migrationen unter `supabase/migrations/` ergaenzen.
5. Migrationen in Supabase ausfuehren.
6. Branch/Commit nach GitHub pushen.
7. Vercel deployt automatisch neu.

Die Daten gehen bei App-Updates nicht verloren, solange sie in Supabase bleiben und Migrationen nicht destruktiv sind. Code-Deployments ersetzen nur die App, nicht die PostgreSQL-Datenbank.

## Sicherheit

- Der Client nutzt nur `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Keine Service-Role Keys im Frontend.
- RLS ist auf allen App-Tabellen aktiv.
- Garten-Daten sind an aktive Mitgliedschaft gebunden.
- Invite-Annahme laeuft ueber eine serverseitige RPC-Funktion, nicht ueber oeffentliche Schreibrechte.
- Punkte werden aus erledigten Aufgaben berechnet, nicht als manipulierbarer Kontostand gespeichert.

Vor Produktivbetrieb sinnvoll:

- Supabase Auth Redirect URLs final setzen.
- Policies mit echten Test-Accounts pruefen.
- Backups fuer Supabase aktivieren.
- Optional Branch-basierte Preview Deployments nutzen.

# Deployment fuer Einsteiger

Diese Anleitung beschreibt den Weg von diesem Ordner bis zu einer laufenden Webseite. Du brauchst drei kostenlose Konten: 

- GitHub: speichert den Code
- Supabase: speichert Login und Datenbank
- Vercel: betreibt die Webseite

Stand: 2026-05-01. Vercel nennt den Hobby-Plan offiziell kostenlos fuer persoenliche Projekte. Supabase nennt den Free Plan als Einstieg mit kostenlosen Projekten. Preise und Limits koennen sich aendern.

## 1. GitHub Repository erstellen

1. Gehe zu `https://github.com`.
2. Erstelle einen Account oder logge dich ein.
3. Klicke oben rechts auf `+` und dann `New repository`.
4. Name z. B. `garten-dienstplan`.
5. Waehle `Private`, wenn nicht jeder den Code sehen soll.
6. Kein README anhaeken, weil hier bereits eins existiert.
7. Klicke `Create repository`.

Dann lokal im Projektordner:

```bash
git remote add origin https://github.com/DEIN-NAME/garten-dienstplan.git
git push -u origin main
```

Wenn GitHub nach Login fragt, folge dem Browser-Login oder nutze GitHub Desktop.

## 2. Supabase Projekt anlegen

1. Gehe zu `https://supabase.com`.
2. Account erstellen oder einloggen.
3. `New project` klicken.
4. Projektname z. B. `garten-dienstplan`.
5. Datenbank-Passwort sicher speichern.
6. Region moeglichst nahe waehlen, z. B. Europa.
7. Projekt erstellen und warten, bis es bereit ist.

## 3. Datenbank einrichten

Im Supabase Dashboard:

1. Links `SQL Editor` oeffnen.
2. Datei `supabase/migrations/001_initial_schema.sql` aus diesem Projekt oeffnen.
3. Inhalt komplett kopieren und im SQL Editor ausfuehren.
4. Datei `supabase/migrations/002_invites_and_task_helpers.sql` komplett kopieren und ausfuehren.
5. Datei `supabase/migrations/003_create_garden_rpc.sql` komplett kopieren und ausfuehren.
6. Optional `supabase/seed.sql` kopieren und ausfuehren, damit Standard-Aufgabenvorlagen vorhanden sind.

Wenn beim Garten-Anlegen ein `Application error` erscheint, pruefe zuerst, ob wirklich alle drei Migrationen ausgefuehrt wurden.

## 4. Supabase API Keys finden

Im Supabase Dashboard:

1. Links `Project Settings`.
2. `API`.
3. Kopiere:
   - Project URL
   - anon public key
   - service_role key

Der `service_role key` ist geheim. Niemals in den Browser, niemals in `NEXT_PUBLIC_...` Variablen.

## 5. Auth einstellen

Im Supabase Dashboard:

1. Links `Authentication`.
2. `Providers`.
3. Email aktivieren.
4. Magic Link und/oder Email Passwort erlauben.
5. Unter `URL Configuration` spaeter diese Redirect URL eintragen:

```text
https://DEINE-VERCEL-DOMAIN.vercel.app/auth/callback
```

Lokal fuer Tests:

```text
http://localhost:3000/auth/callback
```

## 6. Vercel Webseite erstellen

1. Gehe zu `https://vercel.com`.
2. Mit GitHub einloggen.
3. `Add New...` und `Project` klicken.
4. GitHub Repository `garten-dienstplan` importieren.
5. Framework sollte automatisch `Next.js` sein.
6. Environment Variables setzen:

```text
NEXT_PUBLIC_SUPABASE_URL=deine Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein anon public key
SUPABASE_SERVICE_ROLE_KEY=dein service_role key
CRON_SECRET=ein langes zufaelliges Passwort
```

7. `Deploy` klicken.

Nach einigen Minuten zeigt Vercel eine URL an, z. B.:

```text
https://garten-dienstplan.vercel.app
```

Diese URL danach in Supabase Auth als Redirect URL eintragen.

## 7. Erster Start

1. Oeffne die Vercel URL.
2. Klicke Login.
3. Registriere dich mit E-Mail.
4. Lege im Dashboard den Garten/Haushalt an.
5. Du bist automatisch Owner.

## 8. Jemanden einladen

1. Oeffne `Mitglieder`.
2. E-Mail optional eintragen.
3. Rolle waehlen:
   - `member`: Aufgaben sehen/uebernehmen/erledigen
   - `admin`: Mitglieder und Garten verwalten
4. `Invite erstellen`.
5. Den angezeigten Link kopieren und der Person schicken.
6. Die Person oeffnet den Link, registriert/loggt sich ein und klickt `Einladung annehmen`.

## 9. Markus zieht aus, Anna kommt

1. Oeffne `Mitglieder`.
2. Bei Markus `Deaktivieren` klicken.
3. Alte erledigte Aufgaben und Punkte bleiben historisch erhalten.
4. Invite fuer Anna erstellen.
5. Anna oeffnet den Link und tritt bei.

Wenn Markus spaeter zurueckkommt, kannst du ihn wieder `Aktivieren`.

## 10. Namen aendern

Jede Person kann ihren Anzeigenamen selbst aendern:

1. `Garten` oeffnen.
2. Im Feld `Mein Anzeigename` den Namen aendern.
3. Speichern.

Den Gartennamen aendern Owner/Admins ebenfalls unter `Garten`.

## 11. Abwesenheit eintragen

1. `Garten` oeffnen.
2. Datum von/bis eintragen.
3. Grund optional eintragen, z. B. Urlaub.
4. Speichern.

Die automatische Zuweisung beruecksichtigt diese Abwesenheiten.

## 12. Updates

Die Webseite zieht sich nicht selbst per UI-Button den neuesten Git-Stand. Das waere bei Vercel nicht der normale und sichere Weg.

Der richtige Ablauf:

1. Code lokal aendern.
2. Testen:

```bash
npm run typecheck
npm run build
```

3. Commit erstellen:

```bash
git add .
git commit -m "Beschreibung der Aenderung"
```

4. Zu GitHub pushen:

```bash
git push
```

5. Vercel erkennt den Push automatisch und deployed die neue Version.

Wenn eine neue Datenbank-Migration dazukommt:

1. Neue Datei aus `supabase/migrations/` in Supabase SQL Editor ausfuehren.
2. Danach erst den neuen Code deployen oder direkt danach pushen.

## 13. Gehen Daten verloren?

Normalerweise nein. Die Daten liegen in Supabase PostgreSQL. Vercel aktualisiert nur den App-Code.

Daten gehen nur verloren, wenn du in Supabase destruktive SQL-Befehle ausfuehrst, z. B.:

```sql
drop table ...
truncate ...
delete from ...
```

Vor groesseren Migrationen: Supabase Backup erstellen.

## 14. Automatische Jobs

Die App enthaelt einen Vercel Cron Job:

```text
/api/cron/garden-jobs
```

Er laeuft laut `vercel.json` taeglich um 06:00 UTC und:

- erzeugt saisonale Aufgaben aus Vorlagen
- markiert ueberfaellige Aufgaben
- erzeugt Erinnerungs-Notifications

Dafuer muss `CRON_SECRET` in Vercel gesetzt sein. Vercel sendet dieses Secret als Schutz an die Cron-Route.

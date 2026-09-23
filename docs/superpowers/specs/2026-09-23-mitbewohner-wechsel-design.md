# Mitbewohner-Wechsel, Team-Abrechnung und vorab angelegte Personen

Stand: 2026-09-23 · Status: freigegeben (Annahmen 1 + 2 bestätigt)

## Ziel

Wenn Mitbewohner wechseln, soll die jährliche Abrechnung (Nebenkosten, meist im März) fair bleiben:
Alter und neuer Mitbewohner bilden für den Abrechnungszeitraum ein **Team**. Das Team übernimmt die Punkte
des Vorgängers. Liegt das Team unter seinem Soll, wird das Minus nach Anwesenheitszeit aufgeteilt
(Beispiel: neu 2 von 12 Monaten da → trägt 1/6 des Minus, der Vorgänger 5/6).

Zusätzlich:
- Beim Beitritt entscheidet der Admin (in der Einladung), ob die neue Person **jemanden ersetzt** oder **zusätzlich** dazukommt.
- Admins können eine Person **vorab anlegen** (Name + E-Mail). Sie übernimmt ihr Profil inkl. Punkte, sobald sie sich irgendwann mit dieser E-Mail anmeldet.

## Nicht-Ziele (YAGNI)

- Abwesenheiten (Urlaub) senken das Soll nicht.
- Kein Anlegen ohne E-Mail / kein Zusammenführen zweier Konten.
- Keine Mehr-Garten-Unterstützung.

## Begriffe

| Begriff | Bedeutung |
|---|---|
| Platz (Team) | Eine "Stelle" im Haushalt. Jede Mitgliedschaft gehört zu genau einem Platz. Ersetzt B Person A, teilen beide den Platz. |
| Anwesenheit | Tage einer Mitgliedschaft innerhalb des Zeitraums: `max(joined_on, start) … min(left_on, ende)`. |
| Zeitraum | Abrechnungszeitraum, läuft vom letzten Abschluss bis zum nächsten Abschluss (typisch März→März). |

## Datenmodell (Migration 019, additiv)

**garden_members** (neue Spalten)
- `slot_id uuid not null default gen_random_uuid()`: Platz. Beim Ersetzen erbt die neue Person den `slot_id` des Vorgängers.
- `joined_on date not null default current_date` (Backfill aus `joined_at`)
- `left_on date null`: Auszugsdatum. Wird beim Deaktivieren/Ersetzen gesetzt.
- `replaces_user_id uuid null references profiles(id)`: für Anzeige/Historie.

**garden_invites** (neue Spalte)
- `replaces_user_id uuid null references profiles(id)`

**billing_periods** (neu)
- `id, garden_id, starts_on date, ends_on date null, closed_at, closed_by, snapshot jsonb`
- Genau ein offener Zeitraum pro Garten (`ends_on is null`, partial unique index).
- Backfill: ein offener Zeitraum ab Gartenerstellung.
- RLS: Mitglieder lesen, Owner/Admin schreiben.

Ausgezogene Mitglieder bleiben als `is_active = false` in `garden_members`. Sie werden **nicht** gelöscht, damit sie in der Abrechnung bleiben.

## Abläufe

### 1. Einladung mit "ersetzt"
Einladungsformular bekommt das Feld "Ersetzt: — niemand — / Person X". `accept_garden_invite` (security definer):
1. Neue Mitgliedschaft mit `slot_id` = Platz von X, `replaces_user_id` = X, `joined_on` = heute.
2. X wird deaktiviert (`is_active = false`, `left_on` = gestern). Ist X der letzte Owner, übernimmt die neue Person die Owner-Rolle. Owner können nur über Einladungen von Owners ersetzt werden.
3. Offene, nicht erledigte Aufgaben von X gehen an die neue Person.

### 2. Auszug ohne Nachfolger
"Deaktivieren" in der Mitgliederliste fragt ein Auszugsdatum ab (Default heute) und setzt `left_on`.
Wird später doch ein Nachfolger eingeladen, kann er X über das "Ersetzt"-Feld trotzdem ersetzen (auch wenn X schon inaktiv ist).

### 3. Person vorab anlegen
Admin trägt Name + E-Mail (+ optional "ersetzt X") ein. Die Server Action prüft die Owner/Admin-Rolle und legt dann
über den Admin-Client (`auth.admin.createUser`, E-Mail bestätigt, `display_name` in Metadata) ein Konto an.
Der bestehende Trigger erzeugt das Profil, anschließend wird die Mitgliedschaft wie bei Ablauf 1 angelegt.
Die Person ist sofort im Plan (Aufgaben zuweisbar, Punkte). Meldet sie sich Wochen später per Magic Link mit dieser
E-Mail an, ist es dasselbe Konto.
- E-Mail existiert schon als Konto → klare Fehlermeldung "Bitte Einladungslink nutzen".
- Einzige Stelle im User-Flow mit Admin-Client. Begründung: Supabase erlaubt das Anlegen fremder Konten nur mit service_role.

### 4. Abrechnung abschließen (März)
Owner/Admin klickt "Abrechnung abschließen" → Ergebnis wird als `snapshot` gespeichert, `ends_on` = gestern,
neuer Zeitraum ab heute. Buchungen vor dem Beginn des offenen Zeitraums werden abgelehnt. Abgeschlossene Zeiträume bleiben als Archiv lesbar.

## Rechenweg (reine Funktion `lib/billing/teams.ts`, Unit-getestet)

Eingaben: alle Mitgliedschaften (auch inaktive), Aufgaben/Transaktionen/Ausgleiche **im Zeitraum**, Einstellungen.

1. Pro Person: `Ist = Arbeit (Punkte × Stundensatz) + Ausgaben + Betrags-Ausgleiche`.
2. Topf = Summe aller `Ist`.
3. Platz-Gewicht = Anwesenheitstage aller Personen des Platzes. Ein Platz, der erst später dazukommt, bekommt anteilig weniger Soll.
4. `Soll(Platz) = Topf × Platzgewicht / Summe aller Platzgewichte`
5. `Team-Saldo = Summe Ist(Team) − Soll(Platz)`
6. Aufteilung auf die Personen des Teams:
   - **Team-Saldo < 0 (Minus):** nach Anwesenheitstagen (Beispiel oben: 1/6 zu 5/6).
   - **Team-Saldo ≥ 0 (Plus):** nach eigenem `Ist`-Anteil (wer gearbeitet/gezahlt hat, bekommt das Guthaben).
7. Zahlungen zwischen Mitgliedern (`payment`) werden danach auf die persönlichen Salden gebucht. Sie sind Überweisungen und gehören nicht in den Topf.
   Dadurch ergibt die Summe aller Salden genau 0 (behebt den aktuellen Fehler). Zahlungen brauchen deshalb künftig einen Empfänger.
8. Ausgleichs-Vorschläge wie bisher, inklusive ausgezogener Personen.

Beispiel (Soll pro Platz 60 Punkte, alles in Punkten):
Alt 10 Monate 20 P., Neu 2 Monate 15 P. → Team 35 − 60 = −25 → Neu −4,2 / Alt −20,8.

## Aufgabenverteilung (Fairness)

`calculateScores` rechnet einer aktiven Person zusätzlich die Punkte der Vorgänger auf ihrem Platz an.
So startet der Neue nicht bei 0 und bekommt nicht alle Aufgaben.
Zusätzlich dazugekommene Personen (eigener Platz, kein Vorgänger) bekommen einen Startwert, als wären sie seit dem
ersten Beitritt im Garten mit Durchschnittstempo dabei gewesen: `Ø Punkte pro Tag der anderen × Tage vor dem eigenen Beitritt`.

## UI

- **Mitglieder:** Einladung mit "Ersetzt"-Auswahl · Formular "Person vorab anlegen" · Deaktivieren mit Auszugsdatum ·
  Liste "Ausgezogen" mit Platz-Zuordnung.
- **Abrechnung:** Zeitraum-Kopf (seit …) · Tabelle gruppiert nach Platz/Team mit Anwesenheit, Ist, Soll, Anteil ·
  Button "Abrechnung abschließen" (Owner/Admin, mit Bestätigung) · Archiv der abgeschlossenen Zeiträume.
- **Hilfe:** Einträge für Ersetzen, Vorab anlegen, Auszug und Abschluss (`src/lib/help/content.ts`).

## Sicherheit

- Alle neuen Server Actions: `requireUser()` + Owner/Admin-Prüfung.
- `accept_garden_invite`: `replaces_user_id` muss Mitglied desselben Gartens sein.
- Owner kann nur von Owner ersetzt werden (Guard-Trigger aus 018 greift).
- `billing_periods` RLS: lesen Mitglieder, schreiben Owner/Admin.

## Tests

- Unit: `teams.ts`: Beispiel oben, Plus-Fall, Platz ohne Wechsel, später dazugekommener Platz, Salden-Summe = 0,
  Kette A→B→C, Zeitraum-Filter.
- Unit: Fairness-Anrechnung der Vorgänger-Punkte.
- Manuell (mit Supabase): Einladung mit Ersetzen annehmen · Person vorab anlegen und per Magic Link übernehmen ·
  Abrechnung abschließen · Mitglied (nicht Admin) sieht keine Admin-Formulare.

## Offene Annahmen (bitte bestätigen oder korrigieren)

1. Plus eines Teams wird nach eigenem Beitrag verteilt (nicht nach Zeit).
2. Erster Zeitraum startet am Tag der Gartenerstellung. Alles bisher Erledigte zählt in den laufenden Zeitraum.

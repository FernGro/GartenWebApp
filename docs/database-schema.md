# Datenbankschema

Die initiale Migration liegt in `supabase/migrations/001_initial_schema.sql`.

## Kerntabellen

- `profiles`: Anzeigename je Auth User
- `gardens`: Haushalt oder Garten
- `garden_members`: Mitgliedschaft, Rolle und Aktivstatus
- `task_templates`: saisonale und wiederkehrende Aufgabenvorlagen
- `tasks`: konkrete Aufgaben
- `task_comments`: Kommentare je Aufgabe
- `task_events`: Audit-Log fuer Aufgabenaktionen
- `availability`: Abwesenheiten und Nichtverfuegbarkeit
- `notifications`: In-App-Meldungen und spaetere Push/E-Mail-Basis
- `garden_invites`: Invite-Links fuer neue Mitglieder

## Punkte

Gesamtpunkte werden nicht gespeichert. Sie werden aus `tasks` berechnet:

```sql
select completed_by, sum(points)
from public.tasks
where status = 'done'
group by completed_by;
```

## RLS

Alle Garten-bezogenen Tabellen pruefen Mitgliedschaft ueber `public.is_garden_member(garden_id)`. Admin-/Owner-Aktionen nutzen `public.has_garden_role(...)`.

Der erste Garden Owner darf direkt nach Erstellung seines Gartens den eigenen `garden_members`-Datensatz anlegen. Danach greifen die normalen Admin-Regeln.

Invites werden von Owner/Admin erstellt. Die Annahme erfolgt ueber `public.accept_garden_invite(token)`, eine `security definer`-Funktion, die Token, Ablaufdatum und bisherige Annahme prueft und dann Mitgliedschaft anlegt.

Das erste Garten-Onboarding erfolgt ueber `public.create_garden_with_owner(name)`. Die Funktion erstellt Garten und Owner-Mitgliedschaft atomar, damit RLS nicht zwischen Garten-Insert und Mitgliedschafts-Insert blockiert.

`public.accept_garden_invite(token)` darf bestehende Mitglieder nicht mehr herunterstufen. Wenn ein bestehender Owner versehentlich einen Member-Invite annimmt, bleibt die hoehere Rolle erhalten. `public.restore_garden_creator_owner(garden_id)` stellt fuer den Gartenersteller die Owner-Rolle wieder her, falls ein Garten keinen aktiven Owner mehr hat.

`public.prevent_last_owner_loss()` ist ein Datenbank-Trigger auf `garden_members`. Er verhindert, dass der letzte aktive Owner heruntergestuft, deaktiviert oder geloescht wird.

`007_task_control_and_billing.sql` ergaenzt:

- `task_takeover_requests`: Uebernahme-Anfragen, damit fremde Aufgaben nicht einfach erledigt werden.
- `garden_transactions`: Ausgaben und Zahlungen fuer die Gartenabrechnung.
- `garden_billing_settings`: Stundenlohn und Stunden-pro-Punkt.
- `prevent_invalid_task_completion()`: verhindert Erledigungen durch nicht zugewiesene Personen und ausserhalb des ±7-Tage-Fensters.

`008_adjustments_and_notification_contacts.sql` ergaenzt:

- `member_adjustments`: Startwerte, Punktuebernahmen und Geldkorrekturen.
- `notification_contacts`: WhatsApp-Kontaktinfo und Telegram Chat-ID pro Gartenmitglied.

`009_task_delete_policy_and_persistent_events.sql` ergaenzt:

- Owner/Admins duerfen Aufgaben per RLS loeschen.
- `task_events.task_id` bleibt fuer geloeschte Aufgaben nullable erhalten, damit der zentrale Log den Delete weiterhin zeigt.

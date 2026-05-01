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

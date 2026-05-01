# Datenbank-Regeln (Supabase / PostgreSQL)

---

## Migrations-Prinzipien

### Namenskonvention
```
supabase/migrations/
  001_initial_schema.sql
  002_invites_and_task_helpers.sql
  003_create_garden_rpc.sql
  004_invite_no_downgrade_and_owner_recovery.sql
  005_enforce_last_owner.sql
  006_leave_and_delete_garden.sql
  007_naechste_migration.sql      ← immer fortlaufend nummerieren
```

### Regeln für Migrationen

1. **Immer additiv.** Kein `DROP TABLE`, kein `DROP COLUMN`, kein destructives `ALTER`.
2. **Idempotent.** `CREATE OR REPLACE FUNCTION`, `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS` vor `CREATE TRIGGER`.
3. **Eine Datei = ein Thema.** Nicht mehrere unabhängige Features in einer Migration mischen.
4. **Immer `GRANT` nach `CREATE FUNCTION`.** Sonst kann `authenticated` die Funktion nicht aufrufen.
5. **Nach jeder Migration:** `types/database.ts` aktualisieren wenn neue Funktionen/Tabellen.

### Migrations-Template

```sql
-- Beschreibung: Was diese Migration tut und warum

-- Tabellen-Änderungen (wenn nötig)
alter table public.some_table add column if not exists new_col text;

-- Neue oder ersetzte Funktion
create or replace function public.my_function(param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authentifizierungsprüfung IMMER ZUERST
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Autorisierungsprüfung
  if not exists (
    select 1 from public.garden_members
    where garden_id = param
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  ) then
    raise exception 'Insufficient permissions';
  end if;

  -- Eigentliche Logik
  ...
end;
$$;

grant execute on function public.my_function(uuid) to authenticated;
```

---

## Row Level Security (RLS)

### Muster

```sql
-- Lesend: Mitglieder können lesen
create policy "table read members"
on public.table for select
using (public.is_garden_member(garden_id));

-- Schreibend: Admins können schreiben
create policy "table write admins"
on public.table for all
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));
```

### Hilfsfunktionen (in Migration 001 definiert)
- `is_garden_member(garden_id)` — prüft is_active = true
- `has_garden_role(garden_id, roles[])` — prüft Rolle + is_active

### Wann `security definer` statt RLS?

| Szenario | Lösung |
|---|---|
| User braucht erweiterte Rechte für eine atomare Operation | Security Definer RPC |
| Normale CRUD mit eigenen Daten | RLS-Policy |
| Operation überspannt mehrere Tabellen atomar | Security Definer RPC |
| Selbst-Deaktion (z.B. Garten verlassen) | Security Definer RPC |

**Wichtig:** Security Definer = läuft als `postgres` Superuser = RLS wird umgangen.
Deshalb muss die Funktion selbst `auth.uid()` und Berechtigungen prüfen.

---

## Trigger-Regeln

```sql
-- Trigger-Funktion: immer security definer
create or replace function public.trigger_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ...
begin
  -- KRITISCH: für DELETE-Trigger return OLD (nicht NEW!)
  -- NEW ist NULL in DELETE-Triggern
  if tg_op = 'DELETE' then
    -- ... prüfen ...
    return old;   -- erlaubt Löschen
    -- oder: return null; -- verhindert Löschen
  end if;

  -- für UPDATE-Trigger return NEW
  return new;
end;
$$;

-- Trigger neu anlegen (immer DROP IF EXISTS davor)
drop trigger if exists trigger_name on public.table;
create trigger trigger_name
before update of col1, col2 on public.table
for each row execute function public.trigger_name();
```

**Bekannter Bug-Pattern:** `return new` in einem `BEFORE DELETE`-Trigger = `return null` = löscht NICHT.
Immer explizit `return old` für DELETE-Pfade.

---

## Query-Patterns

### In lib/*/queries.ts

```typescript
// Fehlerbehandlung: immer loggen + sicherer Fallback
const { data, error } = await supabase
  .from("garden_members")
  .select("id,garden_id,user_id,role,is_active,profiles(id,display_name)")
  .eq("garden_id", gardenId)
  .order("joined_at", { ascending: true });

if (error) {
  console.error("getGardenMembers", error.message);
  return [];
}

return (data ?? []).map((member) => ({
  ...member,
  // Supabase gibt Joins manchmal als Array zurück — normalisieren
  profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles,
})) as GardenMember[];
```

### Parallele Abfragen

```typescript
// Unabhängige Abfragen parallel ausführen
const [members, tasks, invites] = await Promise.all([
  getGardenMembers(supabase, gardenId),
  getTasks(supabase, gardenId),
  getGardenInvites(supabase, gardenId),
]);
```

### Einzelner Datensatz

```typescript
// maybeSingle() wenn optional (gibt null zurück statt Error)
const { data } = await supabase
  .from("gardens")
  .select("id,name,created_by")
  .eq("id", gardenId)
  .maybeSingle();

// single() wenn garantiert vorhanden (wirft Error wenn kein Ergebnis)
// Nutzen wir NICHT — zu fehleranfällig
```

---

## Datenbankschema-Invarianten

Folgende Invarianten müssen IMMER gelten:
1. Jeder aktive Garten hat mindestens einen aktiven Owner (`is_active=true, role='owner'`)
2. Kaskadenlöschung: `gardens ON DELETE CASCADE` → alle Mitglieder/Aufgaben werden gelöscht
3. Profile-Existenz: `garden_members.user_id` referenziert `profiles.id`
4. Garten-Ersteller: `gardens.created_by` bleibt auch bei Rollen-Änderungen stabil

---

## Indizes

Bestehende Indizes (Migration 001):
```sql
garden_members_user_id_idx    — für User→Gardens-Lookup
garden_members_garden_id_idx  — für Garden→Members-Lookup
tasks_garden_status_idx       — für Dashboard-Abfrage
tasks_assigned_to_idx         — für "Meine Aufgaben"
task_events_task_id_idx       — für Task-History
notifications_user_unread_idx — für Notification-Badge
```

**Neue Indizes** nur anlegen wenn ein konkreter Slow-Query nachgewiesen ist.

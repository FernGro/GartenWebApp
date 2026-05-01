# Sicherheits-Regeln

---

## Pflicht-Checkliste (vor jedem Commit)

- [ ] Alle Server Actions beginnen mit `await requireUser()`
- [ ] Alle SQL-Funktionen prüfen `auth.uid() is null` zuerst
- [ ] Alle SQL-Funktionen prüfen Berechtigungen (Rolle, Garten-Mitgliedschaft)
- [ ] Kein User-Input direkt in SQL-Queries (Supabase client = parametrisiert)
- [ ] Kein `createAdminClient()` in normalen User-Flows
- [ ] Keine Secrets in Client-seitigem Code (`NEXT_PUBLIC_` darf kein Secret)
- [ ] RLS auf allen Tabellen aktiviert (`alter table ... enable row level security`)
- [ ] `security definer` Funktionen haben eigene Berechtigungsprüfung

---

## Authentifizierung

```typescript
// Server Action — immer als ERSTE Zeile
export async function anyAction(formData: FormData) {
  await requireUser();  // wirft redirect("/login") wenn nicht eingeloggt
  // ...
}

// Server Component — wenn User-ID gebraucht wird
const { data: { user } } = await supabase.auth.getUser();
if (!user) return <LoginPrompt />;
```

**Verwende `supabase.auth.getUser()` (Server-validiert), NICHT `getSession()` (Client-Cache).**
`getSession()` kann veraltet sein. `getUser()` validiert immer gegen den Supabase-Server.

---

## Autorisierung

### RLS-Ebene (Datenbankebene)

Alle Tabellen haben RLS. Policies definieren wer was darf.
Schlägt eine RLS-Policy fehl, gibt Supabase einen Fehler zurück (kein leeres Array).

### Anwendungsebene (Server Actions / RPCs)

Zusätzliche Prüfungen in Server Actions:
```typescript
// Rolle prüfen bevor kritische Operation
if (currentRole === "owner" && role !== "owner" && (await activeOwnerCount(gardenId)) <= 1) {
  throw new Error("Der letzte Owner kann nicht heruntergestuft werden.");
}
```

### Security Definer Funktionen (PostgreSQL-Ebene)

```sql
-- Muss beides prüfen: Authentifizierung UND Autorisierung
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.garden_members
    where garden_id = target_id
      and user_id = auth.uid()
      and role = 'owner'
      and is_active = true
  ) then
    raise exception 'Insufficient permissions';
  end if;
  -- ...
end;
```

---

## Input-Validierung

```typescript
// FormData: immer mit readString-Helper (trimmt, gibt "" bei fehlendem Feld)
const name = readString(formData, "name");
if (!name) throw new Error("Name fehlt.");

// Enum-Validierung
const role = readString(formData, "role") as GardenRole;
if (!["owner", "admin", "member"].includes(role)) {
  throw new Error("Ungültige Rolle.");
}

// UUID-Validierung (minimal — Supabase würde DB-Fehler werfen)
const gardenId = readString(formData, "garden_id");
if (!gardenId) throw new Error("Garten fehlt.");
```

**Kein HTML-escaping nötig** — React escaped JSX automatisch.
**Kein SQL-Injection-Risiko** — Supabase-Client nutzt parametrisierte Queries.

---

## Geheimhaltung von Secrets

```
NEXT_PUBLIC_SUPABASE_URL      — öffentlich (ok)
NEXT_PUBLIC_SUPABASE_ANON_KEY — öffentlich (ok, RLS schützt)
SUPABASE_SERVICE_ROLE_KEY     — GEHEIM, nur Server, nie NEXT_PUBLIC_
CRON_SECRET                   — GEHEIM, nur Cron-Route
```

Regeln:
- Kein Secret in `git commit`
- Kein Secret in `NEXT_PUBLIC_` Variablen
- `service_role` nur in `admin.ts` — und nur für Operationen die wirklich keine RLS brauchen
- `.env.local` liegt in `.gitignore`

---

## CORS und Headers

Supabase handhabt CORS für die API automatisch.
Next.js handhabt Security Headers via Vercel.
Keine zusätzliche Konfiguration nötig (Stand: aktuelle App).

---

## Häufige Sicherheitspatterns (die hier genutzt werden)

| Pattern | Implementierung |
|---|---|
| Least-Privilege | RLS + RPC-Berechtigungsprüfung |
| Defense in Depth | RLS + Server Action Check + RPC Check (3 Schichten) |
| Atomare Operationen | Security Definer Transaktionen |
| Audit Trail | `task_events` Tabelle (was wann von wem geändert) |
| Cascading Delete | `ON DELETE CASCADE` + Trigger-Schutz für letzten Owner |

---

## Was NICHT gemacht werden darf

- Rohe SQL-Strings bauen mit String-Concatenation
- `SUPABASE_SERVICE_ROLE_KEY` client-seitig nutzen
- RLS deaktivieren ohne Security Definer Alternative
- `auth.uid()` in Triggern als Authentifizierung ohne Fallback
- Sensible Daten (Passwörter, Tokens) in `task_events` oder `notifications` loggen

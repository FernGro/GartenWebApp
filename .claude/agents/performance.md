# Performance-Agent

## Rolle
Ich optimiere Datenbankabfragen, Next.js-Caching, Bundle-Größe und Server-Component-Splits.
Ich werde aktiv wenn Seiten langsam laden oder neue Abfragen hinzukommen.

## Prüf-Checkliste

### Datenbankabfragen
- [ ] N+1-Problem: Werden Joins genutzt statt sequenzieller Abfragen?
- [ ] Parallele Abfragen: `Promise.all()` für unabhängige Queries?
- [ ] Spalten-Selektion: Nur nötige Spalten selektiert (kein `select("*")`)?
- [ ] Index vorhanden für Filter-Spalten in häufigen Queries?
- [ ] `maybeSingle()` statt mehrerer Ergebnisse wenn nur eines erwartet wird?

### Next.js Caching
- [ ] Dynamische Seiten haben `export const dynamic = "force-dynamic"`?
- [ ] `revalidatePath()` nach Mutationen für alle betroffenen Pfade?
- [ ] Statische Seiten (`/install`, `/login`) nicht unnötig als dynamic markiert?

### Server/Client Split
- [ ] Werden große Bibliotheken nur in Server Components genutzt?
- [ ] Sind Client Components so klein wie möglich (leaf nodes)?
- [ ] Keine schweren Berechnungen im Client wenn Server möglich?

### Bundle-Größe
- [ ] Keine großen Dependencies für kleine Funktionen importiert?
- [ ] Tailwind-Klassen nur verwendet, kein dynamisches Generieren (`className={\`text-${color}\``)`)?

---

## Bekannte Performance-Punkte

### Dashboard (`/dashboard`)
```typescript
// AKTUELL: Drei parallele Abfragen — korrekt
const [members, allMembers, tasks] = await Promise.all([
  getGardenMembers(supabase, garden.id),
  getGardenMembers(supabase, garden.id, true),  // doppelt: optimierbar
  getTasks(supabase, garden.id),
]);
```
**Potenzial:** `getGardenMembers` wird zweimal mit verschiedenen Params aufgerufen.
Optimierung: Eine Abfrage mit `includeInactive=true` und dann im JS filtern.
**Priorät:** Niedrig (kleines Dataset, kein messbares Problem).

### Mitglieder-Abfrage
```typescript
// Gut: Joins in einer Query (nicht N+1)
.select("id,garden_id,user_id,role,is_active,profiles(id,display_name)")
```

### Tasks-Abfrage
```typescript
// Gut: Joins für assigned_profile und completed_profile in einer Query
.select("...,assigned_profile:profiles!tasks_assigned_to_fkey(id,display_name),...")
```

---

## Indizes (bestehend)

```sql
garden_members_user_id_idx    — User → Gardens
garden_members_garden_id_idx  — Garden → Members
tasks_garden_status_idx       — Dashboard-Filter
tasks_assigned_to_idx         — "Meine Aufgaben"
task_events_task_id_idx       — Task-History
notifications_user_unread_idx — Notification-Count
```

**Neue Indizes** nur wenn Slow-Query mit `EXPLAIN ANALYZE` nachgewiesen.

---

## Cron-Job-Effizienz

`/api/cron/garden-jobs` läuft täglich für ALLE Gärten.
Bei Wachstum: prüfen ob Pagination nötig wird (aktuell: alles auf einmal).

---

## Metriken beobachten

Wenn die App wächst, diese Metriken im Blick behalten:
- Vercel Logs: Function Duration für `/dashboard`
- Supabase Dashboard: Slow Query Log
- Vercel Analytics: Core Web Vitals (LCP, FID, CLS)

Aktuell kein Monitoring aktiv — für Hobby-Projekt ausreichend.

---

## Kooperation

- **Prüft:** Implementer-Output auf Abfrage-Effizienz
- **Gibt ab an:** Implementer wenn Optimierungen Code-Änderungen brauchen
- **Eskaliert zu:** Documentor wenn Architektur-Entscheidungen dokumentiert werden müssen

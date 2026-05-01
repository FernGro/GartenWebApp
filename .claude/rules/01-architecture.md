# Architektur-Regeln

---

## Next.js App Router

### Server vs. Client Components

```
Server Component (default):
  - Datenbankabfragen direkt im Component
  - Kein useState, kein useEffect, keine Event Listener
  - Kann async/await auf Top-Level nutzen
  - Rendern auf dem Server, kein JS an den Browser

Client Component ("use client"):
  - Nur wenn nötig: Interaktivität, Browser-APIs, useState
  - So weit unten im Baum wie möglich
  - Beispiel: login-form.tsx (Email/Passwort-State)
```

**Regel:** Beginne immer als Server Component. Client Component nur bei zwingendem Bedarf.

### Server Actions

```typescript
// Immer "use server" am Datei-Anfang (nicht pro Funktion)
"use server";

export async function someAction(formData: FormData) {
  // 1. User-Authentifizierung als ERSTE Zeile
  await requireUser();
  
  // 2. Supabase-Client holen
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  
  // 3. Input lesen und validieren
  const value = readString(formData, "field_name");
  if (!value) throw new Error("Feld fehlt.");
  
  // 4. Datenbankoperation
  const { error } = await supabase.from("table").insert({ ... });
  if (error) throw new Error(error.message);
  
  // 5. Cache invalidieren
  revalidatePath("/betroffener-pfad");
  
  // 6. Weiterleiten (optional, nur bei Navigation)
  redirect("/ziel");
}
```

**Regeln:**
- `requireUser()` IMMER als erste Zeile
- Fehler werden geworfen (nicht returned) — Next.js zeigt Application-Error-Seite
- `redirect()` nur am Ende nach erfolgreicher Operation
- Helper `readString(formData, key)` für FormData-Zugriff

### Datenfluss

```
Browser → Form-Submit → Server Action → Supabase RPC / Tabelle
Browser ← revalidatePath ← Server Action (Cache invalidiert)
Browser ← Re-Render ← Server Component (liest frische Daten)
```

Kein State-Management (kein Redux, kein Zustand). Alles über Server Components + Server Actions.

---

## Komponent-Hierarchie

```
app/page.tsx (Server Component)
  └── AppShell (Server Component — Navigation)
        └── PageContent (Server Component — Datenabruf)
              └── UIComponent (Server oder Client Component)
                    └── ClientComponent ("use client" — nur wenn nötig)
```

### Naming Conventions

```
app/settings/garden/page.tsx     — Seiten-Dateien immer page.tsx
components/settings/...          — Komponenten nach Feature gruppiert
lib/gardens/queries.ts           — Lesende Funktionen
lib/gardens/actions.ts           — Server Actions (Mutationen)
```

---

## Supabase-Client-Nutzung

| Kontext | Import | Beschreibung |
|---|---|---|
| Server Component / Action | `createClient()` from `server.ts` | Mit Cookie-Session |
| Middleware | `createServerClient()` from `@supabase/ssr` | Session-Refresh |
| Browser (Login) | `createClient()` from `client.ts` | Browser-Cookie |
| Admin-Operationen | `createAdminClient()` from `admin.ts` | service_role, kein RLS |

**Niemals** `admin.ts` in Server Actions für normale User-Operationen nutzen.

---

## Fehlerbehandlung

### In Queries (lib/*/queries.ts)

```typescript
const { data, error } = await supabase.from("table").select("...");
if (error) {
  console.error("functionName", error.message);
  return [];  // oder null
}
return data ?? [];
```

### In Server Actions (lib/*/actions.ts)

```typescript
const { error } = await supabase.from("table").insert({ ... });
if (error) {
  throw new Error(error.message);  // wirft, wird von Next.js abgefangen
}
```

### In Components

Keine try-catch in Components. Errors propagieren nach oben.

---

## Caching-Strategie

- Alle Seiten mit Datenbankabfragen: `export const dynamic = "force-dynamic"`
- Nach Mutationen: `revalidatePath()` für betroffene Seiten
- Keine manuelle Cache-Zeit-Konfiguration nötig (Supabase-Daten ändern sich häufig)

---

## Modularität

- Jede Datei in `lib/` hat eine klare Zuständigkeit (queries vs. actions)
- Keine Cross-Domain-Importe (gardens sollte nicht aus tasks importieren)
- Typen in `types/domain.ts` — kein Typ direkt aus Supabase-Schema verwenden
- DB-spezifische Typen in `types/database.ts` — nicht in UI verwenden

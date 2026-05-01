# TypeScript-Regeln

---

## Strikte Typisierung

```typescript
// VERBOTEN
const value: any = ...
const element = document.getElementById("x")!
arr[0]!.property

// ERLAUBT — mit explizitem Warum-Kommentar wenn Assertion nötig
// Die ID existiert garantiert weil sie vom Server gerendert wird
const element = document.getElementById("x") as HTMLInputElement;

// BESSER — defensive Prüfung
const element = document.getElementById("x");
if (!element) return;
```

**Regel:** `any` und `!` (Non-null Assertion) sind verboten ohne erklärendes Kommentar.

---

## Typen-Hierarchie

```typescript
// 1. Domänentypen (types/domain.ts) — in UI und Lib verwenden
export type GardenRole = "owner" | "admin" | "member";
export type Garden = { id: string; name: string; created_by: string | null };

// 2. Datenbanktypen (types/database.ts) — nur für Supabase-Client-Typisierung
// Nie direkt in UI verwenden — immer über Domänentypen mappen

// 3. Kein Inline-Typing für komplexe Formen
// SCHLECHT:
function fn(data: { id: string; garden_id: string; role: "owner" | "admin" | "member" }) {}
// GUT:
function fn(data: GardenMember) {}
```

---

## Naming Conventions

```typescript
// Typen/Interfaces: PascalCase
type GardenMember = { ... };

// Funktionen: camelCase
async function getCurrentGarden() {}

// Server Actions: camelCase + Action-Suffix
export async function updateMemberRoleAction(formData: FormData) {}
export async function leaveGardenAction(formData: FormData) {}

// Konstanten: camelCase (kein SCREAMING_SNAKE_CASE)
const navItems = [...];

// Dateien: kebab-case
// member-actions.ts, garden-settings-panel.tsx

// Komponenten: PascalCase
export function GardenSettingsPanel({ ... }) {}
```

---

## FormData-Pattern

```typescript
// Helper (bereits in mehreren action-Dateien definiert — NICHT duplizieren)
function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Nutzung
const memberId = readString(formData, "member_id");
const active = readString(formData, "active") === "true";
```

**Problem:** Dieser Helper ist in mehreren Dateien dupliziert.
**Aktueller Zustand:** Duplizierung bewusst akzeptiert (kleine Dateien, klar abgegrenzt).
**Wenn refactored:** in `lib/form-helpers.ts` extrahieren.

---

## Prop-Typen in Komponenten

```typescript
// Inline für einfache Komponenten
export function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {}

// Separater Type für komplexere Props
type GardenSettingsPanelProps = {
  garden: Garden;
  profile: Profile | null;
  userRole: GardenRole;
};
export function GardenSettingsPanel({ garden, profile, userRole }: GardenSettingsPanelProps) {}
```

---

## Async/Await

```typescript
// Server Components können direkt awaiten
export default async function Page() {
  const garden = await getCurrentGarden(supabase);
  // ...
}

// Parallele Abfragen für unabhängige Daten
const [members, tasks] = await Promise.all([
  getGardenMembers(supabase, gardenId),
  getTasks(supabase, gardenId),
]);
```

---

## Type Guards

```typescript
// Für union types
function isOwner(role: GardenRole): role is "owner" {
  return role === "owner";
}

// Für nullable Checks — bevorzuge frühes Return
if (!garden) return <EmptyState />;
// Ab hier ist garden garantiert nicht null
```

---

## Database Types Pflege

Wenn eine neue Datenbankfunktion (RPC) angelegt wird:
1. Migration schreiben
2. `types/database.ts` — `Functions`-Block erweitern
3. TypeScript-Fehler lösen sich dadurch auf

```typescript
// types/database.ts — Functions-Block
Functions: {
  leave_garden: {
    Args: { target_garden_id: string };
    Returns: void;
  };
  // ... weitere Funktionen
};
```

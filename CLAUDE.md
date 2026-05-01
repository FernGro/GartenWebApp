# Garten Dienstplan — Claude Configuration

> Alle Regeln, Agenten-Profile und Skills sind in `.claude/` definiert.
> Diese Datei gibt den Überblick; für Tiefe → Unterverzeichnisse.

---

## Projekt

Gemeinschaftlicher Garten-Aufgabenplaner als Progressive Web App.
Mehrere Personen eines Haushalts koordinieren Gartenarbeiten, Punkte zeigen Fairness.
Single-Garden-Modell: ein Nutzer gehört zu genau einem Garten.

**Ziel**: wartbar, sicher, schnell — für Nicht-Entwickler betreibbar.

---

## Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Sprache | TypeScript strict |
| Styling | Tailwind CSS (arbitrary values, kein Design-System) |
| Datenbank | Supabase PostgreSQL + Row Level Security |
| Auth | Supabase Auth (Magic Link + E-Mail/Passwort) |
| Deployment | Vercel (Hobby, Auto-Deploy via GitHub) |
| Cron | Vercel Cron Job (`/api/cron/garden-jobs`, täglich 06:00 UTC) |

---

## Verzeichnisstruktur

```
src/
  app/                       # Next.js App Router — Seiten und API-Routen
    api/cron/garden-jobs/    # Cron: Aufgaben generieren, overdue markieren, Reminder
    auth/callback/           # Supabase Auth Redirect-Handler
    dashboard/               # Hauptseite (Aufgaben + Punkte + Owner-Recovery)
    install/                 # PWA-Installationsanleitung
    invite/[token]/          # Einladungslink annehmen
    login/                   # Login-Seite
    notifications/           # Benachrichtigungen
    settings/garden/         # Gartenname, Verfügbarkeit, Garten verlassen/löschen
    settings/members/        # Mitglieder + Einladungen verwalten
    tasks/                   # Aufgabenliste, Detail-Ansicht, Neue Aufgabe
    tasks/new/               # Neue Aufgabe anlegen
    tasks/[id]/              # Aufgaben-Detail + Kommentare + Aktionen
    templates/               # Aufgaben-Vorlagen verwalten

  components/                # React-Komponenten (Server-first)
    auth/login-form.tsx      # Client Component (benötigt useState)
    availability/            # Verfügbarkeits-Kalender
    dashboard/               # ScoreTable, OwnerRecovery
    layout/app-shell.tsx     # Navigation (Header + Mobile Bottom Nav)
    members/invite-panel.tsx # Mitgliederliste + Einladungs-UI
    settings/                # GardenSettingsPanel
    tasks/                   # TaskCard, TaskForm, CommentList, TaskIcon
    ui/                      # Button, EmptyState, StatusBadge, SetupWarning

  lib/                       # Business-Logik (keine UI)
    auth/session.ts          # getUser(), requireUser()
    gardens/
      actions.ts             # createGardenAction
      member-actions.ts      # updateMemberRoleAction, setMemberActiveAction, restoreOwnerAction
      settings-actions.ts    # updateGardenAction, leaveGardenAction, deleteGardenAction
      invite-actions.ts      # acceptInviteAction
      invites.ts             # getGardenInvites, createInviteAction, deleteInviteAction
      queries.ts             # getCurrentGarden, getGardenMembers
    notifications/           # actions.ts, queries.ts, reminder-actions.ts
    planning/fairness.ts     # suggestAssignee (Fairness-Algorithmus)
    profiles/actions.ts      # updateProfileAction
    supabase/
      client.ts              # Browser-Client
      server.ts              # Server-Client (mit Cookie-Handling)
      admin.ts               # Admin-Client (service_role, kein RLS)
      middleware.ts          # Session-Refresh
      config.ts              # isSupabaseConfigured, getSupabaseConfig
    tasks/                   # actions.ts, queries.ts, comment-actions.ts, comments.ts
    templates/actions.ts     # Template CRUD
    cron/garden-jobs.ts      # Cron-Logik
    format/date.ts           # todayIsoDate, Datumsformatierung

  types/
    database.ts              # Supabase-Typen: Tabellen, Views, Functions, Enums
    domain.ts                # App-Domänentypen: Garden, GardenMember, Task, …

supabase/
  migrations/                # 001–006 SQL (additive, idempotent via CREATE OR REPLACE)
  seed.sql                   # Standard-Aufgabenvorlagen

docs/                        # Menschenlesbare Dokumentation
  beginner-deployment.md     # Schritt-für-Schritt Deployment
  architecture.md            # Architektur-Entscheidungen
  database-schema.md         # DB-Schema-Dokumentation

.claude/                     # KI-Framework (dieses Verzeichnis)
  agents.md                  # Agenten-Übersicht und Aktivierung
  transfer.md                # Token-Übergabe-Protokoll
  rules/                     # Verbindliche Regeln nach Thema
  agents/                    # Detailprofile je Agenten-Rolle
  skills/                    # Arbeits-Pipelines (Feature, Bugfix, Refactor)
```

---

## Datenbankschema (Überblick)

```
profiles          — Nutzerprofil (display_name)
gardens           — Garten (name, created_by)
garden_members    — Mitgliedschaft (role: owner|admin|member, is_active)
garden_invites    — Einladungslinks (token, role, expires_at)
tasks             — Aufgaben (status, points, assigned_to, due_date)
task_templates    — Wiederverwendbare Aufgabenvorlagen
task_events       — Änderungshistorie (assigned, completed, …)
task_comments     — Kommentare zu Aufgaben
availability      — Abwesenheitsfenster (from_date, to_date)
notifications     — In-App-Benachrichtigungen
```

**RPC-Funktionen (security definer):**
- `create_garden_with_owner(garden_name)` — Garten + Owner in einer Transaktion
- `accept_garden_invite(invite_token)` — Einladung annehmen (kein Rollen-Downgrade)
- `restore_garden_creator_owner(target_garden_id)` — Owner-Rolle wiederherstellen
- `leave_garden(target_garden_id)` — Mitgliedschaft löschen
- `delete_garden(target_garden_id)` — Garten + alle Daten löschen
- `role_rank(garden_role)` — Rollen-Rang für Vergleiche

**Trigger:**
- `prevent_last_owner_loss` — Verhindert Verlust des letzten aktiven Owners (UPDATE + DELETE)

---

## Schlüsselprinzipien

1. **Server Components by default.** Client Component (`"use client"`) nur wenn zwingend nötig (useState, Event Listener).
2. **Server Actions für alle Mutationen.** `"use server"` am Datei-Anfang, `requireUser()` als erste Zeile.
3. **RLS schützt alle Tabellen.** Privilegierte Ops laufen über `security definer` RPCs.
4. **Migrationen additiv.** Kein `DROP TABLE`, kein `ALTER COLUMN` ohne Rückwärtskompatibilität. Immer `CREATE OR REPLACE`.
5. **TypeScript strict.** Kein `any`. Kein `!` ohne Kommentar warum nicht null.
6. **Keine Kommentare außer bei nicht-offensichtlichem WHY.** Code ist selbstdokumentierend.
7. **Fehler werden geworfen, nicht verschluckt.** Queries loggen per `console.error` und geben `[]`/`null` zurück; Actions werfen für Next.js-Error-Handling.
8. **Kein over-engineering.** Keine Abstraktionen für hypothetische Anforderungen.

---

## Design-System (Farben)

Alle Farben als Tailwind arbitrary values — kein `tailwind.config.js` für Custom Colors.

```
Primär-Grün:    #2f6b3f
Hintergrund:    #fffef9
Border:         #d7dfcf
Text:           #172016
Text gedämpft:  #5a6655
Akzent-Grün:    #e7efe1  /  #f8faf3
Warning:        bg #fff7e8  border #efc071  text #6f4d16
Gefahr:         Tailwind red-* (red-50, red-200, red-600, red-700, red-800)
```

---

## Agenten-System

Details: `.claude/agents.md`
Übergabe: `.claude/transfer.md`

| Agent | Fokus | Aktivierung |
|---|---|---|
| Implementer | Code schreiben, Patterns einhalten | Standardaufgabe |
| Frontend | UI/UX, Tailwind, Accessibility | Bei Layout- und Designaufgaben |
| Security | RLS, Auth, Input-Validierung | Vor jedem Merge |
| Performance | DB-Queries, Caching, Bundle | Wenn Ladezeiten auffallen |
| Reviewer | Feature-Vollständigkeit, Edge Cases | Nach Implementierung |
| Tester | Tests schreiben, Abdeckung prüfen | Nach jeder Änderung |
| Documentor | docs/ aktuell halten | Nach Feature-Abschluss |

**Empfohlene Pipeline für neue Features:**
`Reviewer → Implementer → Security → Tester → Documentor → Git-Commit`

Pipeline-Details: `.claude/skills/`

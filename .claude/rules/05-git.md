# Git-Workflow-Regeln

---

## Commit-Philosophie

**Commits nach jedem abgeschlossenen, getesteten Schritt.**
Klein und atomar ist besser als ein großer Commit am Ende.
Jeder Commit muss den Build-Stand hinterlassen in dem `npm run typecheck` + `npm run build` funktioniert.

---

## Commit-Protokoll

Bevor jeder Commit:
```bash
npm run typecheck     # TypeScript-Fehler prüfen
npm run build         # Build-Erfolg prüfen
```

Wenn beide sauber:
```bash
git add <spezifische-dateien>      # Nie git add -A ohne Prüfung
git commit -m "..."
```

**Keine `git add .` ohne vorher `git status` gelesen zu haben.**

---

## Commit-Message-Format

```
<Verb> <Was> [<Kontext>]
```

Verben:
- `add` — neues Feature, neue Datei
- `fix` — Bugfix
- `update` — Änderung an bestehendem Feature
- `refactor` — keine funktionale Änderung, nur Struktur
- `remove` — Löschen von Code/Dateien
- `docs` — nur Dokumentation

Beispiele:
```
add leave and delete garden feature
fix trigger return value in DELETE branch for non-owners
update deployment guide for migration 006
refactor member actions to use shared helper
docs add architecture decision for RLS vs security definer
```

**Kein Imperativ im Infinitiv nötig. Kein Punkt am Ende. Max 72 Zeichen.**

---

## Was in welchen Commit gehört

| Commit | Enthält |
|---|---|
| Feature-Commit | Migration + TypeScript-Typen + Actions + UI + Tests |
| Bugfix-Commit | Fix + ggf. Regression-Test |
| Docs-Commit | Nur Dokumentation, keine Code-Änderungen |
| Refactor-Commit | Nur Struktur-Änderungen, keine funktionale Änderung |

**Niemals** Datenbank-Migration ohne zugehörigen TypeScript-Code in separaten Commits trennen — sie gehören zusammen.

---

## Branch-Strategie

```
main  ← einziger Branch (Hobby-Projekt, single developer)
```

Kein Feature-Branch nötig bei diesem Projekt-Scope.
Wenn komplexe Features parallel entwickelt werden sollen: Feature-Branch verwenden.

---

## Deployment-Workflow

```
Code geändert
  → npm run typecheck && npm run build   (lokal testen)
  → git commit
  → git push origin main
  → Vercel erkennt Push → Auto-Deploy
  → Migration manuell in Supabase SQL Editor ausführen
  → App testen auf Vercel
```

**Reihenfolge wichtig:**
Migrations in Supabase **vor** oder **gleichzeitig** mit Code-Deploy anwenden.
Migration nach Code-Deploy = App schlägt fehl bis Migration läuft.

---

## Was NIE committed wird

- `.env.local` (in `.gitignore`)
- `node_modules/`
- `.next/`
- Dateien mit Secrets oder API-Keys
- Binäre Mediendateien (Bilder in `public/` ausnahmsweise ok wenn klein)

---

## Rollback

Wenn ein Deploy kaputt ist:
1. Fehler im Vercel-Log identifizieren
2. Wenn Code-Fehler: Fix committen + pushen
3. Wenn Migrations-Fehler: SQL-Fix in Supabase SQL Editor ausführen
4. Bei kritischem Fehler: `git revert <commit>` + push (erzeugt neuen Revert-Commit)

**Kein `git push --force` auf `main`.**

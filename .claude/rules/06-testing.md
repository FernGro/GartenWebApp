# Testing-Regeln

---

## Aktueller Stand

**Kein automatisiertes Test-Framework ist installiert.**
Aktuell wird manuell getestet. Die Checklisten unten sind verbindlich.

Zukünftige Automation: Playwright für E2E, Vitest für Unit-Tests.
Wenn ein Test-Framework eingeführt wird: diese Datei aktualisieren.

---

## Manuelle Pflicht-Checkliste (vor jedem Commit)

### Build
- [ ] `npm run typecheck` — kein Fehler
- [ ] `npm run build` — erfolgreich

### Auth-Flow
- [ ] Nicht eingeloggter Nutzer wird zu `/login` weitergeleitet
- [ ] Nach Login landet Nutzer auf `/dashboard`
- [ ] Session bleibt nach Seiten-Reload bestehen

### Feature-spezifisch
Für jede geänderte Funktion:
- [ ] Happy Path funktioniert (normaler Ablauf)
- [ ] Fehlerzustand zeigt sinnvolle Fehlermeldung
- [ ] Leerzustand zeigt passende EmptyState-Komponente

---

## Feature-Checklisten

### Aufgaben (tasks)
- [ ] Neue Aufgabe anlegen (Owner/Admin)
- [ ] Aufgabe zuweisen
- [ ] Aufgabe als erledigt markieren
- [ ] Aufgabe kommentieren
- [ ] Aufgaben-Status-Filter funktioniert

### Mitglieder
- [ ] Einladung erstellen (Owner/Admin)
- [ ] Einladungslink öffnen + annehmen (als neuer Nutzer)
- [ ] Mitglied deaktivieren (nicht den letzten Owner)
- [ ] Letzten Owner kann man nicht deaktivieren (Fehlermeldung erscheint)
- [ ] Rolle ändern (nicht letzten Owner downgraden)

### Garten-Einstellungen
- [ ] Gartenname ändern
- [ ] Anzeigename ändern
- [ ] Verfügbarkeit eintragen und löschen
- [ ] Garten verlassen (als Member)
- [ ] Garten verlassen als letzter Owner → Fehler erscheint
- [ ] Garten löschen (als Owner) → alle Daten weg, redirect zu Dashboard
- [ ] Garten löschen Button nur für Owner sichtbar

### Owner Recovery
- [ ] Wenn kein aktiver Owner: Banner erscheint im Dashboard
- [ ] Owner-Rolle wiederherstellen funktioniert
- [ ] Banner verschwindet nach Wiederherstellung

### Dashboard
- [ ] Aufgaben werden angezeigt
- [ ] Punkte-Tabelle korrekt
- [ ] Fairness-Hinweis erscheint beim Mitglied mit wenigsten Punkten

---

## Regressionstest-Protokoll

Nach jeder Änderung an kritischen Bereichen:

| Geänderter Bereich | Zu testende Regression |
|---|---|
| Datenbankfunktionen (RPCs) | Auth + Owner-Schutz + Kaskaden |
| RLS-Policies | Zugriff mit verschiedenen Rollen testen |
| Server Actions | Fehlerfall + Erfolgsfall |
| Navigation (AppShell) | Alle Links erreichbar |
| Middleware | Session-Refresh, unauthentifizierter Zugriff |

---

## Edge Cases die immer geprüft werden müssen

1. **Letzter Owner** — kann nicht gelöscht/deaktiviert/downgraded/verlassen werden
2. **Leerer Garten** — keine Mitglieder außer Owner → alle Features noch nutzbar
3. **Kein Garten** — Dashboard zeigt Create-Form, alle anderen Seiten zeigen EmptyState
4. **Abgelaufener Invite** — Fehlermeldung beim Annehmen
5. **Mehrfach-Einladung** — zweite Annahme → keine Duplikate, Rolle nicht gedowngraded

---

## Zukünftige Automatisierung (Backlog)

Wenn Playwright eingeführt wird, diese Tests automatisieren:
1. Login-Flow (Magic Link kann gemocked werden)
2. Garten erstellen
3. Mitglied einladen + Einladung annehmen
4. Aufgabe erstellen + erledigen
5. Mitglied deaktivieren
6. Letzter-Owner-Schutz

Unit-Tests mit Vitest:
- `calculateScores()` in `lib/tasks/queries.ts`
- `suggestAssignee()` in `lib/planning/fairness.ts`
- `readString()` Helper

# Architektur

Die App trennt UI, Datenzugriff und Domain-Logik bewusst:

- `src/app`: Routing, Server Components und Route Handler
- `src/components`: wiederverwendbare UI-Bausteine und Feature-Komponenten
- `src/lib/supabase`: Browser-, Server- und Middleware-Clients
- `src/lib/tasks`, `src/lib/gardens`: Datenzugriff und Server Actions
- `src/lib/planning`: Fairness- und Saisonlogik
- `src/types`: stabile Domain-Typen und Supabase-Typen

Server Components laden Daten direkt ueber den Supabase Server Client. Schreiboperationen laufen ueber Server Actions. RLS bleibt die verbindliche Sicherheitsgrenze, der Client bekommt nur den Anon Key.

## MVP-Grenzen

Gebaut sind Login, Garten-Onboarding, Aufgabenliste, Aufgabe erstellen, Aufgabe erledigen, Dashboard, Punkteuebersicht, Mitglieder-Invites, Abwesenheiten, Kommentare, Task Events, Notifications und saisonale Task-Erzeugung aus Templates.

Nicht gebaut sind WhatsApp, Service Worker und Push. Diese Bereiche sind dokumentiert und datenmodellseitig vorbereitet, werden aber nicht halb integriert.

## Update-Strategie

App-Code kann jederzeit ueber GitHub/Vercel aktualisiert werden. Persistente Daten liegen in Supabase. Neue Features, die Datenbankfelder brauchen, bekommen additive Migrationen. Destruktive Migrationen muessen separat geplant werden.

## Automatisierung

`vercel.json` definiert einen taeglichen Cron Job auf `/api/cron/garden-jobs`. Die Route nutzt serverseitig `SUPABASE_SERVICE_ROLE_KEY` und ist ueber `CRON_SECRET` geschuetzt. Sie erzeugt saisonale Aufgaben, markiert ueberfaellige Aufgaben und erstellt Erinnerungs-Notifications.

## Integritaet

Aufgaben duerfen nur von der zugewiesenen Person als erledigt markiert werden. Andere Mitglieder koennen eine Uebernahme anfragen. Die aktuelle Zuweisung oder Owner/Admins koennen diese Uebernahme bestaetigen. Erledigungen sind nur im Zeitfenster von sieben Tagen vor bis sieben Tagen nach Faelligkeit erlaubt.

Owner/Admins koennen falsch erledigte Aufgaben wieder oeffnen. Der zentrale Log unter `/log` dokumentiert die Aktionen.

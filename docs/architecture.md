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

Gebaut sind Login, Garten-Onboarding, Aufgabenliste, Aufgabe erstellen, Aufgabe erledigen, Dashboard, Punkteuebersicht, Mitglieder-Invites, Abwesenheiten, Kommentare, Task Events, Notifications, Kalenderansicht und saisonale Task-Erzeugung aus Templates. Das Dashboard zeigt Punkte klassisch als Tabelle/Diagramm und zusaetzlich als Rasenmaeher-Rennen mit Podest.

Nicht gebaut sind WhatsApp, Service Worker, Push und Foto-Nachweise. Diese Bereiche sind dokumentiert und datenmodellseitig vorbereitet, werden aber nicht halb integriert. Foto-Nachweise bleiben bewusst draussen, weil sie fuer den aktuellen Haushalt keinen Mehrwert bringen und spaeter Speicher-/Datenschutzfragen oeffnen wuerden.

## Update-Strategie

App-Code kann jederzeit ueber GitHub/Vercel aktualisiert werden. Persistente Daten liegen in Supabase. Neue Features, die Datenbankfelder brauchen, bekommen additive Migrationen. Destruktive Migrationen muessen separat geplant werden.

## Automatisierung

`vercel.json` definiert einen taeglichen Cron Job auf `/api/cron/garden-jobs`. Die Route nutzt serverseitig `SUPABASE_SERVICE_ROLE_KEY` und ist ueber `CRON_SECRET` geschuetzt. Sie erzeugt saisonale Aufgaben, markiert ueberfaellige Aufgaben und erstellt Erinnerungs-Notifications.

## Integritaet

Aufgaben duerfen nur von der zugewiesenen Person als erledigt gemeldet werden. Die Meldung setzt den Status `pending_review` und gibt noch keine Punkte. Owner/Admins bestaetigen die Erledigung; erst dann wird der Status `done` gesetzt und die Punkte zaehlen. Andere Mitglieder koennen eine Uebernahme anfragen. Die aktuelle Zuweisung oder Owner/Admins koennen diese Uebernahme bestaetigen. Erledigungen sind nur im Zeitfenster von sieben Tagen vor bis sieben Tagen nach Faelligkeit erlaubt.

Owner/Admins koennen falsch erledigte Aufgaben wieder oeffnen. Der zentrale Log unter `/log` dokumentiert die Aktionen.

Aufgaben werden beim Loeschen nicht hart entfernt, sondern in den Papierkorb verschoben (`cancelled`). Owner/Admins koennen sie wiederherstellen. Dadurch bleiben Verlauf, UI und spaetere Pruefung nachvollziehbar.

Es gibt bewusst keinen hartcodierten globalen Admin-Login und kein Master-Passwort. Adminrechte sind immer an Supabase Auth und die Gartenrolle `owner` oder `admin` gebunden.

Aufgaben, Uebernahmegruende und Kommentare laufen serverseitig durch eine einfache Inhaltspruefung unter `src/lib/moderation/content.ts`. Das ist kein vollwertiges Moderationssystem, verhindert aber offensichtliche unsachliche Eintraege ohne externe Dienste.

## UI

Die UI bleibt mobile-first und leichtgewichtig. Wiederkehrende Visuals werden ohne zusaetzliche Icon- oder Animationsbibliothek gebaut:

- Task-Icons als lokale SVG-Komponenten
- Rasenmaeher-Ladeanimation in `src/app/loading.tsx`
- Punkte-/Fairness-Rennen in `src/components/dashboard/score-race.tsx`
- Monatskalender fuer Aufgaben und Abwesenheiten unter `/calendar`
- reduzierbare Animationen via `prefers-reduced-motion`

## Benachrichtigungen

In-App-Notifications bleiben der robuste Standard. Telegram ist optional vorbereitet und nutzt serverseitig `TELEGRAM_BOT_TOKEN`. WhatsApp wird nur als Kontaktinformation gespeichert, weil die offizielle WhatsApp Business Platform kein einfacher kostenloser Push-Kanal ist. Echte Browser Web Push Notifications laufen ueber VAPID Keys, `public/sw.js` und gespeicherte Subscriptions in `web_push_subscriptions`.

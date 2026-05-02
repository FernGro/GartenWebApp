# Planungsalgorithmus

Der MVP-Vorschlag fuer automatische Zuweisung ist in `src/lib/planning/fairness.ts`.

Algorithmus:

1. Aktive Mitglieder des Gartens laden.
2. Erledigte Aufgaben je Mitglied summieren.
3. Letzten erledigten Dienst je Mitglied bestimmen.
4. Nicht verfuegbare Personen fuer das Faelligkeitsdatum entfernen.
5. Nach niedrigsten Punkten sortieren.
6. Bei Gleichstand die Person mit dem aeltesten letzten Dienst bevorzugen.

Die Implementierung speichert keine Ranking-Ergebnisse in der Datenbank. Sie berechnet den Vorschlag aus Tasks und Availability-Daten.

Die Task-Erstellung nutzt diesen Algorithmus serverseitig, wenn keine Person manuell gewaehlt wurde. Dadurch werden Abwesenheiten auch dann beruecksichtigt, wenn ein Client manipuliert oder veraltet ist.

## Saisonlogik

`isTemplateInSeason` unterstuetzt normale Saisonbereiche und Bereiche ueber den Jahreswechsel, z. B. Dezember bis Februar.

Wiederkehrende Generierung ist im MVP manuell ueber die Vorlagen-Seite aktiv. Ein spaeterer Cron Job oder eine Supabase Edge Function kann dieselbe Logik zeitgesteuert ausloesen.

Der Vercel Cron Job `/api/cron/garden-jobs` loest diese Automatisierung serverseitig aus, wenn `SUPABASE_SERVICE_ROLE_KEY` und `CRON_SECRET` gesetzt sind.

## Forecast

Die Seite `/forecast` zeigt eine unverbindliche Vorschau fuer die naechsten drei Monate. Sie beruecksichtigt:

- aktive Mitglieder
- bisherige Punkte
- letzte Dienste
- Abwesenheiten
- saisonale Templates

Forecast-Eintraege sind noch keine verbindlichen Aufgaben. Verbindlich werden sie erst, wenn Aufgaben erzeugt oder uebernommen werden.

## Visualisierung

Das Dashboard zeigt Punkte nicht nur tabellarisch, sondern auch als Rasenmaeher-Rennen. Wichtig: Diese Visualisierung ist rein lesend. Sie veraendert keine Planung und speichert keine zusaetzlichen Punktestaende. Die faire Zuweisung bleibt weiterhin an den Algorithmus gebunden, der niedrigere Punktestaende bevorzugt.

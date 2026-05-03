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

## Garten-Kadenz

Der Forecast nutzt zusaetzlich `src/lib/planning/cadence.ts`. Diese Schicht verhindert unsinnige Wiederholungen wie zweimal Unkraut jaeten innerhalb weniger Tage.

Aktuelle MVP-Regeln:

- Rasenmaehen mit Mulcher: alle 21 Tage, Mindestabstand 14 Tage, April bis Oktober.
- Unkraut jaeten: alle 60 Tage, Mindestabstand 45 Tage, April bis September.
- Blaetter entfernen: monatlich im Herbst.
- Hecke schneiden: wenige gezielte Termine mit grossem Abstand.
- Schnee bleibt `on_demand` und wird nicht automatisch geplant.

Die Regeln ueberschreiben alte zu enge Template-Intervalle im Forecast, in der saisonalen Generierung und im Cron Job.

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

Aufgaben mit Status `pending_review` zaehlen noch nicht als erledigt. Sie beeinflussen Punktestand, Abrechnung und Fairness erst nach Owner/Admin-Bestaetigung als `done`.

Forecast-Eintraege koennen jetzt eingeloggt werden. Dadurch entsteht eine echte Aufgabe mit `assignment_locked = true`. Fixierte Aufgaben werden bei `Fair neu zuweisen` nicht ueberschrieben.

## Visualisierung

Das Dashboard zeigt Punkte nicht nur tabellarisch, sondern auch als Rasenmaeher-Rennen. Wichtig: Diese Visualisierung ist rein lesend. Sie veraendert keine Planung und speichert keine zusaetzlichen Punktestaende. Die faire Zuweisung bleibt weiterhin an den Algorithmus gebunden, der niedrigere Punktestaende bevorzugt.

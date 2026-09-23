# Browser-Tests (E2E)

Klickt die App wie echte Nutzer durch: alle Seiten fuer Owner, Admin und Mitglied (Handy- und Desktop-Breite,
inkl. Pruefung auf seitliches Scrollen) und rund 30 Ablaeufe von "Dienst erledigt" bis "Abrechnung abschliessen".

Die Tests legen Testnutzer an und loeschen sie wieder. Sie laufen **nur gegen eine lokale Supabase**
(`env.mjs` bricht bei allen anderen URLs ab).

## Einmalig einrichten

1. Docker Desktop starten.
2. Lokale Supabase mit allen Migrationen starten, z. B. in einem leeren Ordner:
   ```bash
   npx supabase init
   # supabase/migrations/*.sql aus diesem Repo mit Zeitstempel-Praefix hineinkopieren, seed.sql nach supabase/seed.sql
   npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,storage-api,postgres-meta,supavisor
   npx supabase status -o env   # zeigt API_URL, ANON_KEY, SERVICE_ROLE_KEY
   ```

## Ausfuehren

```bash
export E2E_SUPABASE_URL=http://127.0.0.1:54321
export E2E_SUPABASE_ANON_KEY=...          # ANON_KEY aus supabase status
export E2E_SUPABASE_SERVICE_ROLE_KEY=...  # SERVICE_ROLE_KEY aus supabase status

# App gegen die lokale Supabase bauen und starten
NEXT_PUBLIC_SUPABASE_URL=$E2E_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$E2E_SUPABASE_ANON_KEY \
SUPABASE_SERVICE_ROLE_KEY=$E2E_SUPABASE_SERVICE_ROLE_KEY CRON_SECRET=localcron npm run build
NEXT_PUBLIC_SUPABASE_URL=$E2E_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$E2E_SUPABASE_ANON_KEY \
SUPABASE_SERVICE_ROLE_KEY=$E2E_SUPABASE_SERVICE_ROLE_KEY CRON_SECRET=localcron npx next start -p 3200 &

npm run test:e2e
```

- Browser: das installierte Google Chrome (anderer Pfad ueber `E2E_CHROME_PATH`).
- App-Adresse: `E2E_BASE_URL` (Standard `http://localhost:3200`).
- Bei Fehlern landen Screenshots in `tests/e2e/shots/`.
- `npm run test:e2e` setzt die Testdaten jedes Mal neu auf (`seed.mjs`).

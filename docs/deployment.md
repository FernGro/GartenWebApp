# Deployment

## Vercel

Die App ist als Standard-Next.js-Projekt Vercel-kompatibel.

Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Build:

```bash
npm run build
```

## Supabase

Vor dem Deployment:

1. Migration aus `supabase/migrations/001_initial_schema.sql` ausfuehren.
2. Optional `supabase/seed.sql` fuer globale Vorlagen ausfuehren.
3. Auth Redirect URLs setzen:
   - lokal: `http://localhost:3000/auth/callback`
   - Vercel: `https://<domain>/auth/callback`

## Sicherheitscheck

- Keine Service Role Keys im Frontend.
- RLS ist auf allen Tabellen aktiviert.
- Garten-Daten sind an aktive Mitgliedschaft gebunden.
- Rollen fuer Admin-/Owner-Aktionen sind modelliert.
- Punkte werden aus erledigten Aufgaben berechnet, nicht als Kontostand gepflegt.
- Invite-Annahme erfolgt ueber eine kontrollierte RPC-Funktion.

## Updates ohne Datenverlust

Code liegt in GitHub, Deployments laufen ueber Vercel. Daten liegen in Supabase PostgreSQL und bleiben bei Deployments erhalten.

Bei neuen Features:

1. Neue Migration unter `supabase/migrations/` anlegen.
2. Lokal testen.
3. Migration in Supabase ausfuehren.
4. Code nach GitHub pushen.
5. Vercel deployed automatisch.

Keine `drop table`, `truncate` oder destruktiven Migrationen ohne Backup und expliziten Plan ausfuehren.

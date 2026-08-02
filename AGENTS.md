# AGENTS.md

## Repo shape

Two independent npm packages (`client/`, `server/`) — **not** a workspace monorepo. Each has its own `node_modules`. Install and run from within each directory.

- `client/` — React 19 + Vite 7 + Tailwind CSS 4 frontend
- `server/` — Express 5 + Prisma + Supabase backend
- `supabase/functions/` — single Deno edge function (`keep-alive`), deployed via Supabase CLI
- `prototype/` — static HTML/JS prototypes, reference only

## Essential commands

```bash
# Backend
cd server
npm install
npm run dev          # tsx watch, port 5000
npm run build        # prisma generate && tsc
npm test             # tsx --test src/**/*.test.ts (Node built-in runner, not Jest)

# Database
npx prisma migrate dev       # local dev migration
npm run db:push              # push schema without migration
npm run db:seed              # seed via Supabase service_role (creates auth users)
npm run db:studio            # Prisma Studio on :5555

# Frontend
cd client
npm install
npm run dev          # Vite dev server, port 5173
npm run build        # tsc -b && vite build
npm run lint         # eslint
```

**No `tsc:check` script exists** despite README references. Use `npx tsc --noEmit` in either package for type checking.

## Auth architecture — this is the most important thing to get right

The auth stack is **Supabase Auth**, not custom JWT:

- **Browser**: `client/src/lib/supabase.ts` creates a Supabase client with `flowType: 'implicit'` (not PKCE — PKCE breaks admin invite links). Sessions persist in localStorage.
- **API client**: `client/src/lib/axios.ts` attaches the Supabase access token via `supabase.auth.getSession()` on every request. No manual refresh logic — Supabase handles it.
- **Server verification**: `server/src/utils/supabaseJwt.ts` verifies tokens via remote JWKS (`jose` library, asymmetric). No shared JWT secret. The `SUPABASE_URL` must be set for the JWKS endpoint to resolve.
- **Auth middleware chain** (escalating strength):
  1. `requireSupabaseSession` — verifies Supabase token only, no DB lookup
  2. `requireRegistrationSession` — also checks `public.users` row; allows unregistered Google `@cnu.edu.ph` identities through for profile completion
  3. `authenticate` — requires a `public.users` row that is not disabled; returns 403 (not 401) for missing profiles to avoid refresh loop

**Critical**: A 403 "Profile setup required" is **not** an error — it's the expected state for new Google users who haven't completed registration. Do not treat it as a 401 or trigger sign-out.

## Environment gotchas

- `server/.env` needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — the service_role key bypasses RLS and must never reach client code.
- `client/.env.local` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — the anon key is public by design.
- `DIRECT_URL` in server env is for Prisma direct connections (bypasses connection pooler). Required for migrations.
- `CLIENT_URL` on the server controls CORS allowlist — must match the Vercel domain exactly including `https://`.
- Production server crashes on missing `DATABASE_URL`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` (startup validation in `server/src/config/env.ts`).

## Server startup

On boot, `npm start` runs `server/scripts/run-migrations.mjs` which applies pending Prisma migrations with 3 retries (handles Supabase cold-start). Server refuses to start if migrations fail — this is intentional to prevent serving with a mismatched schema.

## Testing

- Tests live in `server/src/__tests__/*.test.ts`
- Runner: `tsx --test` (Node.js built-in test runner)
- Security tests spin up the Express app on a random port and make HTTP requests — no database required
- Other tests may need a live database connection

## Path aliases

Both packages use `@/*` → `./src/*`:
- Client: configured in `tsconfig.app.json` and `vite.config.ts`
- Server: configured in `tsconfig.json`

## Frontend conventions

- UI components: Shadcn UI primitives in `client/src/components/ui/` — use these, don't rebuild from scratch
- Forms: `react-hook-form` + `zod` resolvers
- Styling: Tailwind CSS 4 utility classes only
- Routing: React Router 7. `ProtectedRoute` wraps authenticated pages; `RoleRoute` gates by role (ADMIN, REVIEWER, REVIEWEE)
- State: React Context for auth (`AuthContext`) and notifications (`NotificationContext`)
- API calls: always use the `api` instance from `client/src/lib/axios.ts`

## Backend conventions

- Pattern: Routes → Controllers → Services
- Validation: Zod schemas in `server/src/validators/`
- Errors: throw `ApiError` instances, handled by global `errorHandler` middleware
- DB: always use the shared Prisma client from `server/src/config/db.ts` (singleton in dev to avoid connection leaks)
- Async: wrap async handlers with `catchAsync` utility
- UUID params: globally validated by regex in `server/src/routes/v1/index.ts` for common param names

## Issue tracker

GitHub Issues in `baphus/normalite-edge`, driven by `gh` CLI. See `docs/agents/issue-tracker.md`.
Triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

## Domain docs

Single-context repo — one `CONTEXT.md` plus `docs/adr/` at root. See `docs/agents/domain.md`.

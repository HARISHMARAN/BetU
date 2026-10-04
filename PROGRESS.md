# BetU — Build Progress

Last updated: 2026-10-04. Read this first before continuing work.

## Where things stand

Phase 1 MVP (per the product spec, section 28) backend is **functionally complete and verified end-to-end**. Mobile app is **scaffolded with core infra (API client, auth, active-bet timer state) but has no screens/UI yet** — that's the next piece of work.

Repo: `https://github.com/HARISHMARAN/BetU` (pushed). Branching strategy: `.github/BRANCHING_STRATEGY.md` (Git Flow: main/develop/feature/bugfix/hotfix/release).

Current branch state on remote:
- `main`, `develop` — both at the initial scaffold commit only (branching docs, CI template, PR template).
- `feature/BETU-001-monorepo-scaffold` — has **all** the actual work below. Not yet merged to `develop`. Next session should either keep building on this branch or open the PR to `develop` first — ask the user which.

## Architecture

Monorepo, npm workspaces:
```
packages/shared/   — pure TS calc functions + types, used by both api and mobile
apps/api/          — NestJS + Prisma + PostgreSQL
apps/mobile/       — Expo (SDK 57) + TypeScript + Expo Router
```

### packages/shared (done, 57 tests passing)

Pure, dependency-free TS. This is the single source of truth for scoring math — both the API and mobile import it, so the formulas can never drift between client and server.

- `calc/accuracy.ts` — spec §7 formula: `accuracy = max(0, 1 - |actual-predicted|/predicted)`. Also returns `biasPercentage` (signed: positive = underestimated).
- `calc/timer.ts` — `calculateElapsedSeconds({startedAt, now, pausedSeconds, pausedAt})`. Derives elapsed time **purely from timestamps**, never an incrementing counter — this is the spec §5 requirement that the timer survive app kill/background/lock screen. If `pausedAt` is set, elapsed time is frozen at that moment.
- `calc/timeIq.ts` — weighted rolling average of accuracy history (oldest→newest), exponential recency decay (0.9/step), scaled to 0–1000. `tierForScore()` maps to the 6 named tiers from spec §8.
- `calc/timeDna.ts` — `computeTimeDnaEntry()` aggregates a category's completed bets into the spec §10 stats block (avg predicted/actual, median error, under/over-estimation %, bias %, predicted:actual ratio).
- `calc/confidence.ts` — sample-size → Low/Medium/High (spec §12 thresholds: <5, 5-14, 15+). **Not yet wired to any endpoint** — this is for the BetU-prediction feature (phase 2), kept here because it's cheap and pure.
- `calc/formatDuration.ts` / `calc/feedback.ts` — "X min Y sec" formatting and the contextual Result-screen copy ("Almost perfect...", "Close one...", "You seriously underestimated...") per spec §6. Thresholds: ≥90% accuracy → "almost perfect"; <50% abs bias → "close one"; else → "seriously under/overestimated" with the ×multiplier.

Build: `npm run build --workspace=@betu/shared` (tsc). Test: `cd packages/shared && npx vitest run`.

### apps/api (done, 21 tests passing, verified against live Postgres)

NestJS. Prisma schema deliberately trimmed to MVP scope: **User, Category, Bet only** — no `PredictionProfile` or `Streak` tables yet (those are phase 2 features per spec §28; computing Time DNA on-the-fly from `Bet` rows is good enough for v1 and avoids a cache-invalidation problem).

Modules:
- **auth** (`src/auth/`) — guest mode (`POST /auth/guest`, no body, creates a user instantly), email register/login (bcrypt), and `PATCH /auth/link-email` to upgrade a guest account to email (spec §17 "save your Time DNA across devices"). JWT, 30-day expiry, no refresh tokens yet.
- **categories** (`src/categories/`) — `GET /categories` returns 8 global defaults (`userId=null`, seeded via `prisma/seed.ts`) plus the user's own. `POST /categories` creates a custom one. Note: custom categories are a Pro feature per spec §25 — the endpoint exists but nothing enforces the paywall yet; that gating belongs in a future monetization pass, not blocking it here would be premature.
- **bets** (`src/bets/`) — the core state machine: `CREATED → ACTIVE ⇄ PAUSED → COMPLETED|ABANDONED`. Every mutation re-checks ownership (`findFirst({id, userId})`, throws 404 if not found/not yours — deliberately not 403, so we don't leak existence). `finish` computes `actualSeconds` via `@betu/shared`'s timer calc (frozen at `pausedAt` if currently paused), accuracy/bias via the shared accuracy calc, generates feedback copy, and recomputes the user's cached `timeIqScore` from their last 50 completed bets.
- **analytics** (`src/analytics/`) — `GET /analytics/dashboard` (Time IQ + this-week summary), `GET /analytics/time-dna` (per-category breakdown), `GET /analytics/time-iq`.

**Not built yet** (explicitly phase 2 per spec §28, don't add prematurely): `/predictions` endpoint (BetU's own prediction), streaks, friend bets, any AI/ML.

Run locally:
```bash
cd apps/api
cp .env.example .env          # already done once; DB creds match docker-compose.yml
docker compose -f ../../docker-compose.yml up -d db   # from repo root, or `npm run db:up`
npx prisma migrate deploy     # migration already created: prisma/migrations/20261004144523_init
npx ts-node prisma/seed.ts    # idempotent — check-then-create, safe to re-run
npm run dev                   # nest start --watch
```
Test: `npx jest` (21 tests). Build: `npm run build` → entry is `dist/src/main.js` (not `dist/main.js` — nest's outDir mirrors `src/`, this tripped us up once already, see package.json's `start` script).

### apps/mobile (scaffolded, no screens yet — this is the next work)

Expo SDK 57, Expo Router (file-based routing — the scaffold's own `AGENTS.md` mandates this over manually wiring React Navigation; routes go in `src/app/`, not built yet). React 19 / RN 0.86.

Built so far:
- `src/theme.ts` — design tokens. Dark surface (`#0E1013`), amber BET action color (`#FFB020`) so the primary action visually dominates per spec §24. Not visually verified — no simulator was available in this environment; next session should run `npx expo start` and actually look at it.
- `src/api/client.ts` — typed fetch wrapper for every MVP endpoint. Reads `EXPO_PUBLIC_API_URL` (defaults to `localhost:3000`).
- `src/storage/tokenStorage.ts` — SecureStore-backed JWT + cached `PublicUser` (no `/me` endpoint exists, so the cached user from login/register/guest response is trusted until next auth action; Time IQ display should always refetch from `/analytics/time-iq` rather than trust the cached value, since that goes stale).
- `src/state/authStore.ts` (zustand) — `bootstrap()` runs on cold start: reuse stored session, or silently call `/auth/guest` so first launch never requires signup (spec §17).
- `src/state/activeBetStore.ts` (zustand + AsyncStorage) — **read this one carefully before touching the timer flow.** Elapsed time is always recomputed from locally-persisted timestamps (`startedAt`/`pausedAt`/`pausedSeconds`), never a counter — so pause/resume/finish math is correct even if the app was killed. Pause/resume/finish/abandon are **optimistic-local-first**: the local timer state updates immediately and is authoritative for display; the matching API call fires best-effort in the background and failures are swallowed (local state is already correct, so a dropped pause/resume network call doesn't corrupt the UI — though see the known gap below).

  **Known scope cut, flagged for the user, not yet resolved:** creating a brand-new bet (`start()`) still requires connectivity — it calls `POST /bets` then `POST /bets/:id/start` and surfaces the error if offline, rather than queuing a local-only bet with a temp ID for later server reconciliation. Spec §21 technically asks for offline bet creation too. Building full client/server ID reconciliation felt like overengineering for v1 (spec §29 explicitly warns against this), so the line drawn was: *timer continuity through app-kill/background/lock is bulletproof (the headline, testable requirement in §5); full offline-first bet creation is deferred.* If the user wants it anyway, it needs: a client-generated UUID, a local "unsynced bets" queue, and a reconciliation step that swaps the local ID for the server ID once a create call succeeds — propagating that swap into any already-queued pause/resume/finish calls for that bet.

  Also: if `pause`/`resume`'s background API call fails (offline mid-session) and never retries, the **server's** copy of `pausedAt`/`pausedSeconds` goes stale, so if `finish()` later succeeds in reaching the server, the server computes `actualSeconds` from its own (stale) timestamps — potentially wrong. The mobile `finish()` call doesn't currently send its own authoritative local numbers as an override. Low-probability edge case (requires being offline at the exact moment of pause/resume, then online again by finish), not fixed yet.

- `metro.config.js` — monorepo-aware (watches workspace root, resolves `@betu/shared` across the npm workspace symlink).

**Not built yet (the actual next session's work):**
1. `src/app/_layout.tsx` — root layout, call `authStore.bootstrap()` and `activeBetStore.load()` on mount, show a loading state until both resolve.
2. `src/app/(tabs)/_layout.tsx` + 4 tab screens (Bet/Home, History, DNA, Profile) per spec §24.
3. Home screen: title input → category chips → duration picker → "BET X MIN" button (spec §4). Spec lists "Prediction" as a separate screen; current plan is to combine title+category on Home and duration-picker+BET-button on a pushed `prediction` screen, for the "5 second interaction" goal in spec §23 — worth sanity-checking with the user once there's something to look at.
4. Active Bet screen (stack screen, pushed outside tabs) — live timer display (tick every ~1s via `setInterval`, but always recompute from `activeBetStore`'s timestamps, never increment a local counter), Pause/Finish/Abandon buttons.
5. Result screen — prediction vs actual, accuracy %, feedback copy, DONE / BET AGAIN.
6. History screen — list from `GET /bets`, filter chips (today/week/month).
7. Time DNA screen — per-category bias list from `GET /analytics/time-dna`.
8. Profile screen — Time IQ (fetch fresh, don't trust cached value), guest→email upgrade form (calls `authStore.linkEmail`), sign out.

No UI has been visually tested — there was no iOS/Android simulator available in this environment. Before calling any screen "done," run it on a simulator or device.

## Known bugs fixed along the way (context for future debugging)

- `packages/shared`'s `BetStatus` enum originally used lowercase string values (`"created"`) while the Prisma schema (the actual wire format) uses uppercase (`"CREATED"`). Fixed to uppercase — this enum wasn't used anywhere yet when found, so no runtime breakage, but would have silently broken any status comparison on the mobile client.
- `packages/shared` had an unused, unconfigured `eslint@8` devDependency that got hoisted to the workspace root and collided with mobile's required `eslint@9` (`eslint-config-expo` needs v9's `eslint/config` export). Removed the dead dependency; required a full `node_modules` + `package-lock.json` wipe and reinstall because npm doesn't prune orphaned lockfile entries on a plain `npm install`.
- Mobile `tsconfig.json`: `baseUrl` is deprecated in TypeScript 6 (which this Expo SDK ships) — removed it, `paths` resolves relative to the tsconfig location now. Also needed `"types": ["node"]` explicitly for `process.env` typing (`expo/tsconfig.base` doesn't include Node types by default).
- Prisma/Postgres: `@@unique([userId, name])` on `Category` does **not** dedupe global categories (`userId=null`) across repeat seed runs — Postgres treats `NULL` as distinct from `NULL` in unique constraints. `prisma/seed.ts` uses find-then-create instead of upsert for that reason.
- NestJS `nest build` output lands at `dist/src/main.js`, not `dist/main.js` (outDir mirrors the `src/` structure) — `package.json`'s `start` script accounts for this.

## Environment notes

- Disk filled up once mid-session (npm cache was 6.9GB) — if installs start failing with `ENOSPC`, `npm cache clean --force` first.
- Docker Desktop was not running at session start; needed `open -a Docker` and a wait loop before `docker compose up` worked.
- Postgres runs via `docker-compose.yml` at repo root (`betu`/`betu_dev_password`/`betu` db, port 5432).

## Suggested next steps (in order)

1. Decide: keep building on `feature/BETU-001-monorepo-scaffold`, or open the PR to `develop` now and continue on a new branch. (Not done yet — ask the user.)
2. Build the mobile screens listed above, starting with the root layout + tab shell so there's something to run.
3. Run `npx expo start` and actually look at it on a simulator/device — nothing has been visually verified yet.
4. Decide the Home/Prediction screen split (combined vs. the spec's literal 2-screen flow) once there's a UI to react to.
5. Once the core loop works end-to-end on-device, revisit the offline-creation gap and the pause/resume stale-server-state gap above if they matter for the target users.

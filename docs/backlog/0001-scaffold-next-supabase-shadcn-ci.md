---
id: 0001
title: Scaffold Next.js 15 + Tailwind + shadcn + Supabase local + CI gating
status: in-progress
priority: P0
area: infra
created: 2026-06-16
owner: gtm-innovation
---

## User story

As the founder of LevelUp Kids, I want a Next.js 15 project that boots in one `npm install && npm run dev`, talks to a local Supabase, lints clean, types clean, has Playwright + vitest installed, and pushes branches that gate on three CI checks — so the autonomous fleet can take it from here without me writing another line of plumbing.

## Why now (four lenses)

### Product Owner
This is the only ticket the human ships. Every subsequent ticket is the dev agent's. The smallest meaningful unit of value is: a fleet-installable repo where every other ticket can pass through the loop end-to-end. If any of the three gating checks doesn't work after this ticket, no ticket after it can land.

### Stakeholder
The moat starts here. A scaffold that bakes in the design tokens, the warm light theme, the `callAI()` boundary, and the privacy-by-construction posture means every subsequent ticket inherits those instead of fighting them. Skipping the scaffold quality bar is the cheapest way to lose the year — the agents will inherit whatever default they find.

### User (in the real moment of use)
The user feels nothing yet. But the founder, on the day they install the fleet, feels everything: a clean `fleet status` row, a green PR within an hour, and a working `npm run dev`.

### Growth
A working scaffold means the first design-partner family can be onboarded in week 2, not week 3. That's a week of compounding learning.

## Acceptance criteria

Each box maps 1:1 to a test or verifiable behavior.

- [ ] `npm install` from a fresh clone succeeds on Node 22 LTS in under 4 minutes.
- [ ] `npm run dev` boots Next.js 15 on http://localhost:3000 and returns 200 on `/` with the placeholder landing page that includes the H1 "Raise the kind of adult you actually want to raise." in Fraunces.
- [ ] `npm run lint` runs ESLint (`next lint` config) + `node scripts/check-backlog.mjs` in one command. Exits 0 on a clean tree.
- [ ] `npm run typecheck` runs `tsc --noEmit` against `tsconfig.json` with `"strict": true`. Exits 0 on a clean tree.
- [ ] `npm run test` runs vitest in `tests/` (one smoke test included that asserts `level(0) === 0` and `level(550) === 5`). Exits 0.
- [ ] `npm run test:e2e` runs Playwright with two configured projects: `chromium` and `mobile-webkit`. One smoke spec asserts the landing page loads on both projects. Exits 0.
- [ ] `supabase start` brings up a local Postgres + Auth via `supabase/config.toml`. `supabase/seed.sql` exists (empty placeholder is fine for this ticket).
- [ ] `src/lib/supabase/server.ts` exports `createServiceSupabase()`. `src/lib/supabase/browser.ts` exports `createBrowserSupabase()`. Neither file imports the other.
- [ ] `src/lib/ai/client.ts` exists with stub `callAI()` and `callAIWithJSON()` signatures that throw `not-implemented-in-v1.0` — the boundary is in place; the implementation is a v1.1 ticket.
- [ ] `src/styles/tokens.css` defines every CSS variable from `docs/DESIGN.md §2`. `globals.css` imports `tokens.css` and Tailwind.
- [ ] Fraunces (variable, optical 9–144) and Söhne (or Public Sans fallback if Söhne licensing is unavailable) are loaded via `next/font` — no CDN URLs in the page source. JetBrains Mono loaded the same way.
- [ ] shadcn/ui installed via `npx shadcn@latest init`. Primitives `button`, `card`, `dialog`, `input`, `label`, `badge` are installed. The button primitive uses `--brand-500` for the primary variant; default is not blue.
- [ ] `.github/workflows/ci.yml` defines three jobs named `lint`, `unit-tests`, `e2e-tests` that map 1:1 to the gating check names in AGENTS.md § Agent parameters.
- [ ] `.github/workflows/ci.yml`'s `e2e-tests` job starts Supabase via the official action, runs `supabase db reset --linked false`, runs `supabase db execute --file supabase/seed.sql`, builds Next, then runs `npx playwright test`.
- [ ] No purple-gradient class is present anywhere in `src/` (`grep -r 'gradient-to.*purple' src/` returns nothing). No `font-family: Inter` reference anywhere.
- [ ] `README.md`'s "Local development" command block runs end-to-end without modification.

## Out of scope

- Auth wiring (ticket 0003).
- Any database tables (ticket 0002).
- Any business logic.
- shadcn primitives we don't need yet (skip `data-table`, `command`, `carousel`).
- Storybook. Not in the v1.0 toolchain.
- A favicon redesign. The default Next.js one is fine; design ships in 0018.

## Engineering notes

- Use `npx create-next-app@latest levelup-kids --typescript --tailwind --eslint --app --src-dir --turbopack` then strip the demo content from `app/page.tsx`.
- Tailwind v4 (the new `@import "tailwindcss"` style). Configure `--brand-500` etc. as Tailwind theme tokens in `app/globals.css` via the `@theme` block.
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, path alias `@/*` → `./src/*`.
- Use Supabase CLI's `supabase init` to scaffold `supabase/`. Commit `supabase/config.toml` and `supabase/migrations/` (empty for now; 0002 fills it). Add `supabase/.temp/` and `supabase/seed.sql` to `.gitignore` exceptions appropriately.
- Playwright: install the `@playwright/test` package, run `npx playwright install --with-deps chromium webkit`, configure `playwright.config.ts` with two projects (`chromium` and `mobile-webkit` using the iPhone 15 device descriptor).
- New deps allowed in this ticket: `next@15`, `react@19`, `react-dom@19`, `typescript`, `tailwindcss@4`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `vitest`, `@vitest/ui`, `@playwright/test`, `@supabase/supabase-js`, `@supabase/ssr`, `motion`, `lucide-react`, plus the shadcn-installed deps and shadcn-init deps. Do NOT install: `framer-motion` (use `motion`), `swr` (use React Query later if needed), `tanstack-table`, analytics SDKs.
- `.env.example` ships with these keys (empty values): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_AI_PREVIEW`.
- Privacy/security surface change: none (no data collection yet).

## Implementation log

- 2026-06-16 [ship/0001] Started on `feat/0001-scaffold-next-supabase-shadcn-ci`. Scaffolding Next.js 15 (App Router, TS strict, Tailwind v4) in repo root, wiring local Supabase, Playwright (chromium + mobile-webkit), vitest, shadcn/ui primitives, and the three CI gating jobs (`lint` / `unit-tests` / `e2e-tests`).

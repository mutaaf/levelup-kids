# LevelUp Kids — agent quick reference

**Full docs:** See `README.md` for project overview, `docs/PRD.md` for product spec, `docs/ARCHITECTURE.md` for technical details, `docs/DESIGN.md` for the visual system, `docs/GTM.md` for go-to-market.

**Contract:** See `AGENTS.md` — read before every change.

## Quick reference

### Architecture
- **Next.js 15 (App Router)** — TypeScript strict, Tailwind v4, shadcn/ui, warm light theme
- **Supabase** — Postgres + Auth (magic link) + RLS + Storage. Service role on server, browser client for `auth.*` only.
- **AI** — single `callAI()` boundary at `src/lib/ai/client.ts` (Anthropic → OpenAI fallback). v1.0 is stubbed; v1.1 wires the AI Family Coach.
- **PWA** — installable iOS + Android via `public/manifest.webmanifest` + service worker.
- **Hosting** — Vercel (auto-deploy on push to `main`).

### Critical rules
1. **Data access** — Client uses `query()`/`mutate()` from `src/lib/api.ts`. NEVER direct Supabase client for DB reads.
2. **API routes** — Always `createServiceSupabase()`. RLS protects everything; service-role bypasses it for server-side seeds and event writes.
3. **AI calls** — Through `callAI()`/`callAIWithJSON()` in `src/lib/ai/client.ts`. No direct provider imports outside `src/lib/ai/`.
4. **Children's data** — Minimum collection. First name, age, avatar, XP totals. No last name, no school, no photos, no location. Any new field on `children` is a discussion, not a ticket.
5. **Voice** — Banned words: journey, amazing, exciting, elevate, unlock, empower, synergy, revolutionize, seamless, effortless, transform. No emoji in headings or buttons (the `🔥` streak chip is the only allow-listed exception).
6. **Visual** — Warm cream + ink + terracotta. NO purple gradients on white. NO Inter / Roboto / Open Sans. Use Fraunces (display) + Söhne (body).
7. **Before pushing** — `npm run lint && npm run typecheck && npm run test && node scripts/check-backlog.mjs` — all green.

### Commands
```
npm run dev          # Development server (http://localhost:3000)
npm run lint         # ESLint (0 errors required)
npm run typecheck    # tsc --noEmit
npm run test         # vitest unit tests
npm run test:e2e     # Playwright (chromium + mobile-webkit)
npm run build        # production build
node scripts/check-backlog.mjs   # backlog integrity gate
```

### Key files (after 0001 ships)
```
src/lib/quests/selector.ts        — v1 rule-based quest seeder
src/lib/quests/seed-library.ts    — hand-written quest templates
src/lib/growth/score.ts           — Family Growth Score formula
src/lib/growth/level.ts           — floor(totalXp / 100)
src/lib/ai/client.ts              — callAI() boundary (multi-provider)
src/lib/api.ts                    — client query()/mutate()
src/lib/events.ts                 — internal event logger (PostHog feed for v1.1)
src/styles/tokens.css             — CSS variables (color, type, space)
src/components/pillars/PillarBadge.tsx
src/components/xp/XpRing.tsx
src/components/growth/FamilyGrowthRadar.tsx
```

### Pillars (system fixed)
`scholar · athlete · builder · creator · leader · character · explorer · purpose`

### Tier shape (v1.1 wires Stripe)
- **Free** — 1 household, 3 children, basic quests, basic Family Growth Score
- **Premium ($9.99/mo or $84/yr)** — unlimited children, AI Family Coach, advanced analytics, seasonal campaigns

## The agent loop

Three (optionally four) agents run on this repo on the `agent-fleet` kit. Read `AGENTS.md § Agent parameters` for the per-project specifics.

- `ship` — every hour at :17 — runs `implementation-dev` against the top groomed ticket.
- `groom` — every 6h at :41 — runs `gtm-innovation` to re-prioritize + add fresh tickets.
- `review` — every 5 min — grades open `feat/` and `eng/` PRs against AGENTS.md.
- `eng` — every 6h (ENG_ENABLED=0 in v1.0; flipped to 1 for v1.1 hygiene tickets).

Slash commands for manual passes: `/ideate`, `/groom`, `/ship`, `/review`, `/backlog`.

Install / inspect:
```
bash ../agent-fleet/lib/install.sh /Users/mutaafaziz/Desktop/projects/levelup-kids
../agent-fleet/bin/fleet status
# or: http://127.0.0.1:7070 (fleet-control portal)
```

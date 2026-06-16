<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (15) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — contributor guide for autonomous agents

This file is the contract for any AI agent (Claude, GPT, etc.) or human contributor working on LevelUp Kids. Read it before you change a single line.

## The non-negotiables

These are not opinions, they're the product:

1. **No regressions allowed.** Every change passes `npm run lint`, `npm run typecheck`, and `npm run test` locally before commit. Branch protection on `main` enforces three gating checks: `lint`, `unit-tests`, and `e2e-tests`. `e2e-tests` runs the Playwright suite (chromium + mobile-webkit projects) against a real local Supabase seeded by `supabase/seed.sql`. A red Playwright run blocks the merge. Never bypass branch protection.

2. **Children's data is the contract, not a feature.** LevelUp Kids collects the minimum data needed to run the loop: first name, age, avatar choice, quest history, XP. No last name, no school, no photos, no location, no behavior notes. Any new field on `children` is a discussion in a ticket, not a unilateral change. The privacy page at `/privacy` makes specific promises.

3. **Service-role on the server, helper-functions on the client.** API routes use `createServiceSupabase()` from `src/lib/supabase/server.ts` (bypasses RLS). Client code uses `query()` / `mutate()` from `src/lib/api.ts` — never `createBrowserSupabase()` for DB reads. The only sanctioned client-Supabase call is `supabase.auth.*`.

4. **Every AI call goes through `callAI()` / `callAIWithJSON()`.** Multi-provider abstraction in `src/lib/ai/client.ts` resolves Anthropic → OpenAI per call. Every call is logged to the `events` table for cost telemetry. Never `import Anthropic from '@anthropic-ai/sdk'` outside `src/lib/ai/` — that breaks provider failover and cost accounting.

5. **Tier gating is server-AND-client.** Use `<UpgradeGate>` on the surface AND verify the tier in the API route. UI-only gates can be bypassed by anyone who reads the source. (v1.0 ships the boundary; v1.1 enforces tiers when Stripe goes live.)

6. **Test first, then code.** For auth / tier / RLS / AI / XP / score changes, add or update a vitest spec before implementation. For UI flows, add a Playwright E2E spec. The spec is the proof the feature works and the proof it doesn't regress.

7. **Voice is "intentional parent's family OS," not "AI for everything" or "kids gamification app."** UI copy and AI prompts respect the parent and never patronize the child. Banned words: `journey`, `amazing`, `exciting`, `elevate`, `unlock`, `empower`, `synergy`, `revolutionize`, `seamless`, `effortless`, `transform`. No emoji in headings or button labels — the `🔥` streak chip is the single allow-listed exception (lives only in `src/components/xp/StreakChip.tsx`).

8. **Visual is warm light, not corporate flat.** Cream paper + ink + terracotta. NO purple gradients on white. NO Inter / Roboto / Open Sans — Fraunces (display) + Söhne (body) only. See `docs/DESIGN.md §11` for the full "no" list.

## Three (or four) agents, one backlog

LevelUp Kids is built by a fleet of subagents working through a single backlog:

| Agent | Role | Lives at | Touches |
|---|---|---|---|
| **gtm-innovation** | PO + stakeholder + parent-user + growth lead. Generates and grooms feature tickets. | `.claude/agents/gtm-innovation.md` | `docs/backlog/` only — **never** `src/`, `tests/`, `e2e/`, or `supabase/migrations/` |
| **implementation-dev** | Test-first executor. Picks the top groomed ticket, writes the failing test, implements, ships as a `feat/` PR with auto-merge. | `.claude/agents/implementation-dev.md` | Everything — but always via a feature branch + PR, never direct to `main` |
| **review** | Grades the PR against AGENTS.md + the ticket's acceptance criteria. Posts `--comment` (clean) or `--request-changes` (blocking) with line-anchored notes. | `.claude/agents/review.md` | Read-only on the diff. Only writes via `gh pr review`. |
| **eng-dev** *(optional; ENG_ENABLED=0 in v1.0)* | Engineering hygiene tickets — type safety, refactor, perf, test infra, dependency bumps. Ships on `eng/` branches. | `.claude/agents/eng-dev.md` | `src/`, `tests/`, `e2e/`, build config — never user-facing behavior |

The backlog at `docs/backlog/` is the single source of truth for what gets built next. Each ticket is a self-contained markdown file (`NNNN-kebab-title.md`) with frontmatter (id, title, status, priority, area, created, owner) and a body that includes user story, four-lens "Why now" (Product Owner / Stakeholder / User / Growth), acceptance criteria mapped to test scenarios, out-of-scope, and engineering notes. See `docs/backlog/README.md` for the full conventions.

**The full autonomous loop:**

```
gtm-innovation ──► implementation-dev ──► review ──► auto-merge ──► auto-deploy
   (launchd            (launchd                (launchd polls     (GitHub when      (Vercel on
    every 6h)           every 1h)              every 5 min)        CI green +         push to
                                                                   no blocking         main)
                                                                   review)
```

All agents run **locally** via your `claude` CLI against your Claude subscription. The shared fleet engine lives at `~/.local/share/agent-fleet/` (installed from `/Users/mutaafaziz/Desktop/projects/agent-fleet/`).

Each handoff is gated:
- **implementation-dev → review**: Dev opens the PR with `gh pr merge --auto --squash`. GitHub holds the merge.
- **review → merge**: branch protection requires `lint`, `unit-tests`, and `e2e-tests` green. The reviewer posts a `--comment` sign-off (informational) or a `--request-changes` review which **blocks** the auto-merge. Because the reviewer runs as the repo owner, GitHub forbids self-approval — request-changes is the blocker, not approve as the unblocker.
- **merge → deploy**: Vercel watches GitHub; every push to `main` triggers a production deploy.

**Gating vs non-gating checks.** Exactly three checks gate a merge: `lint`, `unit-tests`, `e2e-tests`. Every other status — `Vercel`, `Vercel Preview Comments`, future nightly checks — is informational. A red Vercel check never blocks a merge and is never a reason to "fix" a PR.

**Self-healing.** A PR can pass every gating check and still refuse to merge because its branch fell `BEHIND` `main`. The ship agent's first phase *tends* the in-flight PR before considering new work: rebases a `BEHIND` branch via `gh pr update-branch`, attempts a bounded recovery on a genuinely red gating check (≤ 2 `heal:` commits), and only stands down when the PR is healthy and mid-flight. A single stuck PR can't freeze the loop.

**Self-learning.** `docs/LESSONS.md` is the loop's append-only operational memory. Every agent reads it at the start of a run and appends a one-line lesson on a novel failure or healing action.

**Slash commands** (manual, interactive — you drive):
- `/ideate [focus area]` — gtm-innovation adds tickets. Optional `$ARGUMENTS` like "growth", "moat", "onboarding", "quests".
- `/groom` — gtm-innovation re-prioritizes + prunes without adding new tickets.
- `/ship [ticket-id]` — implementation-dev executes the top groomed ticket (or a specific id).
- `/backlog` — read-only summary of the current backlog state.
- `/review <PR#>` — manual reviewer pass on a specific PR.

## Architecture, in one paragraph

LevelUp Kids is a **Next.js 15 App Router** PWA on **Supabase** (Postgres + Auth + Storage + RLS), deployed on **Vercel**, billed via **Stripe** (wired in v1.1). Parents sign in with a magic link, create a household, invite a co-parent, add 1–3 children (name + age + avatar), and pick 2–3 focus pillars from the eight (`scholar`, `athlete`, `builder`, `creator`, `leader`, `character`, `explorer`, `purpose`). The system seeds the first week of quests (3 daily + 1 weekly per child, rule-based via `src/lib/quests/selector.ts` in v1.0; AI-augmented in v1.1). Each child opens their own view on the parent's device — avatar, level (`floor(totalXp / 100)`), today's quests — completes a quest, taps "I did it," and the parent approves from the dashboard. Approved quests award XP, which feeds the **Family Growth Score** — a 0–100 score per pillar over a trailing 28-day window, visualized as a radar chart on the parent dashboard. v1.0 has no AI Coach, no badges, no payments, no push, no PostHog — the 6-week wedge proves the daily loop, and v1.1 layers the differentiator and monetization on top. Mobile-first warm light theme (cream + ink + terracotta), installable iOS + Android PWA.

## Directory map

```
levelup-kids/
├── AGENTS.md                ← you are here
├── README.md                ← user-facing overview, setup, fleet install
├── CLAUDE.md                ← Claude-Code-specific quick reference
├── agents.config.sh         ← fleet manifest (plumbing only — semantics live below in § Agent parameters)
├── .claude/
│   └── agents/
│       ├── gtm-innovation.md       ← the PO + growth subagent
│       ├── implementation-dev.md   ← the test-first dev subagent
│       ├── review.md               ← the contract-enforcing reviewer
│       └── eng-dev.md              ← optional engineering hygiene
├── docs/
│   ├── PRD.md               ← product requirements (the why + what)
│   ├── ARCHITECTURE.md      ← technical architecture (the how)
│   ├── DESIGN.md            ← visual system, voice, components
│   ├── GTM.md               ← go-to-market plan
│   ├── ROADMAP.md           ← v1.0 → v1.1 → v2
│   ├── LESSONS.md           ← agent-writable operational memory
│   └── backlog/
│       ├── README.md        ← backlog conventions + index
│       ├── _template.md     ← copy this when writing a new ticket
│       └── NNNN-*.md        ← one file per ticket
├── scripts/
│   └── check-backlog.mjs    ← deterministic backlog integrity check (gates CI)
├── src/                     ← Next.js 15 app (ticket 0001 scaffolds this)
├── supabase/                ← migrations + seed.sql + config.toml (ticket 0001 scaffolds)
├── tests/                   ← vitest unit + AI contract tests
├── e2e/                     ← Playwright specs (chromium + mobile-webkit)
└── .github/workflows/ci.yml ← lint + unit-tests + e2e-tests
```

## How to add a feature (the canonical loop)

**If you're a human** — pick a ticket from `docs/backlog/`, branch, follow the loop below. Or invoke `/ship <ticket-id>` to delegate to implementation-dev.

**If you're implementation-dev** — your full execution loop is in `.claude/agents/implementation-dev.md`. The condensed version:

1. **Pick the ticket.** Top-priority `groomed` (or `proposed` if none groomed). Read it in full.
2. **Branch.** `git checkout -b feat/<ticket-id>-<slug>`.
3. **Mark in-progress.** Update the ticket's frontmatter + the README index row.
4. **Write the failing test FIRST.** For backend / XP / score changes: vitest. For UI flows: Playwright. Map every acceptance-criteria checkbox to a test scenario.
5. **Run the test locally.** Confirm it fails for the right reason.
6. **Write the minimum code to pass the test.** Match the surrounding style.
7. **Run the full local gate** — all must pass:
   ```
   npm run lint
   npm run typecheck
   npm run test
   node scripts/check-backlog.mjs
   ```
   And, if the change touches UI flows, `npm run test:e2e`.
8. **Commit.** Message names the user-facing behavior. Trailer:
   ```
   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   ```
9. **Push the branch + open a PR.** `git push -u origin HEAD && gh pr create --fill && gh pr merge --auto --squash`.
10. **Watch CI.** `gh pr checks --watch`. Green = ticket frontmatter + README index row → `shipped` in a follow-up commit on the same branch. Red = fix, push, repeat. Never bypass.

## Hard NOs

- **Don't push directly to `main`.** Branch protection rejects it. Always a feature branch + PR.
- **Don't disable a passing test** to make CI green. Fix the underlying bug instead.
- **Don't bypass branch protection.**
- **Don't widen what we collect on minors.** Adding a new field on `children` is a discussion in a ticket.
- **Don't introduce an analytics SDK, error reporter, or tracker that fires on page load** in v1.0. Internal `events` table is the only telemetry until v1.1 wires PostHog.
- **Don't hardcode an AI provider.** Always through `callAI()` / `callAIWithJSON()`.
- **Don't call Supabase directly from client components** for DB reads/writes. Use `query()` / `mutate()` from `src/lib/api.ts`.
- **Don't gate features only on the client.** Always pair `<UpgradeGate>` with server-side `canAccess()`.
- **Don't introduce a top-level dependency** without an authorizing line in the ticket's "Engineering notes."
- **Don't ship "AI-generic" UI.** No purple gradients, no Inter / Roboto / Open Sans, no emoji-decorated headings, no confetti. Match the warm cream + terracotta aesthetic.
- **Don't use banned words** in copy or AI prompts: `journey · amazing · exciting · elevate · unlock · empower · synergy · revolutionize · seamless · effortless · transform`.
- **Don't ship a screen that wasn't in the v1.0 PRD §6 eleven** without first promoting the ticket from proposed via a groomer pass.
- **Don't loop on the same change.** If `git status` is clean after an apparent change, exit cleanly — don't push an empty commit.

## Agent parameters

> Read by the shared `agent-fleet` runners at runtime. The one place the generic ship/groom/review prompts look for LevelUp Kids's specifics.

- **Gating checks** — EXACTLY these three GitHub check names gate a merge. Everything else (`Vercel`, preview comments, future nightly jobs) is informational and MUST be ignored when deciding mergeability or what to "fix":
  - `lint`
  - `unit-tests`
  - `e2e-tests`
- **Agent branch prefixes**: `feat/` (features, ship), `chore/gtm-` (backlog refresh, groom), `eng/` (engineering hygiene — only when ENG_ENABLED=1).
- **Local gate command** (heal/dev runs this before pushing; all must pass):
  `npm run lint && npm run typecheck && npm run test && node scripts/check-backlog.mjs`
- **Subagents** (in `.claude/agents/`): `implementation-dev`, `gtm-innovation`, `review`, `eng-dev`.
- **Backlog areas**: `auth | household | children | onboarding | pillars | quests | xp | growth | dashboard | pwa | infra | ai | billing | privacy | analytics | growth-loop | design`.
- **Backlog validator**: `node scripts/check-backlog.mjs`, wired into the `lint` gating job — keeps ticket files and the README index in sync.

## Known issues

(none right now — `docs/LESSONS.md` is the living version.)

## License

Private. For me, and for whoever I hand a copy to. AI agents may contribute, but credit yourself in the commit trailer.

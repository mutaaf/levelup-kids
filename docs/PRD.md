# PRD — LevelUp Kids v1.0

**Status:** approved · **Last reviewed:** 2026-06-16 · **Owner:** product

The Product Requirements Document is the source of truth for *what* v1.0 ships and *why*. Tickets in `docs/backlog/` implement specific slices of this document; if a ticket contradicts the PRD, the PRD wins until updated here.

## 1. Problem

Parents want their children to grow into curious, confident, capable, creative, faithful, healthy, kind, resilient adults — but the daily reality is reactive. Screen time gets argued. Homework gets nagged. Sports practice happens because it's already on the calendar. There is no shared family system that turns "we want our kids to be X" into "here's what we did this week toward X."

Existing tools optimize the wrong layer:
- **Chore apps** (Greenlight, BusyKid) treat parenting as task assignment with monetary reward.
- **Habit trackers** (Habitica, Streaks) are adult-shaped and lose kids by week two.
- **Learning apps** (Duolingo, Khan Academy) own one slice (language, math) and don't roll up into a family view.
- **Family calendars** (Cozi, Apple) coordinate logistics but don't surface character development.

LevelUp Kids is the family-scoped version of Duolingo's daily-streak loop, applied to the whole child — not one subject.

## 2. Who it serves (personas)

### Imran & Sara — the intentional parents
- Two children, ages 7 and 10.
- Highly educated, dual-income, urban.
- Want their kids to grow up faithful, curious, kind, physically capable.
- Already pay for Duolingo, Khan Academy, Headspace, a soccer league. None of them roll up.
- The moment-of-use: Sunday evening — *"What do we want to focus on this week as a family?"*

### Layla — the older child (10)
- Has her own phone or shared tablet.
- Will open an app daily IF the loop is short, the rewards are visible, and the friction is low.
- Hates being told what to do; loves choosing from a menu.
- The moment-of-use: 7:15am before school — *"What's my quest today?"*

### Yusuf — the younger child (7)
- No phone of his own; uses the parent's device or a shared one.
- Needs parent assistance for most quests.
- Loves stickers, levels, and showing off progress.
- The moment-of-use: weekend — *"Dad, can I do my builder quest now?"*

### Out of v1 personas
- Teenagers (13+). The reward shape changes; v2 problem.
- Single-parent households. Supported (Sara can be the only parent) but onboarding copy assumes co-parents.
- Schools, coaches, therapists. Explicitly excluded.

## 3. The product, in one paragraph

A parent signs up, creates a household, invites a co-parent (optional), adds one to three children with age + interests, and picks two to three focus pillars from the eight. The platform seeds the first week's quests — three daily quests per child mapped to the household's focus pillars, plus one weekly mission. Each child opens their own view (avatar, level, XP bar, today's quests), completes a quest, taps "ready for approval," and the parent confirms from their dashboard. Approved quests award XP, which raises the child's level (Level = floor(totalXP / 100)) and feeds the Family Growth Score — a 0–100 score per pillar, visualized as a radar chart on the parent dashboard. The score is the moat: it makes "are we actually raising the kid we said we wanted to raise" a measurable, week-over-week question.

## 4. The eight pillars (system fixed)

| slug | name | examples (age 7–10) |
|---|---|---|
| `scholar` | Scholar — curious & literate | Read 20 minutes · Learn 5 new words · Solve a math puzzle |
| `athlete` | Athlete — strong & coordinated | Practice dribbling · 15-min outdoor play · Stretch routine |
| `builder` | Builder — hands & engineering | Build with Lego · Fix something at home · Use a real tool |
| `creator` | Creator — art & expression | Draw a portrait · Write a song · Make a stop-motion |
| `leader` | Leader — voice & responsibility | Plan dinner · Teach a sibling · Run a family meeting |
| `character` | Character — virtue & faith | Daily prayer · Honest reflection · Acts of kindness |
| `explorer` | Explorer — nature & adventure | Identify 3 plants · Visit a new place · Try a new food |
| `purpose` | Purpose — service & meaning | Help a neighbor · Donate something · Family project for others |

The eight are durable and intentional — they describe the kind of adult a child becomes, not the activities a child does. Activities are quests; pillars are who.

## 5. Core loop

```
parent picks focus pillars
        ↓
system seeds daily quests + weekly mission (rule-based in v1; AI-augmented in v1.1)
        ↓
child opens app → sees today's quests → completes one → taps "ready"
        ↓
parent dashboard → approves → XP awarded → level + Family Growth Score updates
        ↓
streak builds → "show me" moment (badge, level-up animation, weekly recap)
        ↓
parent screenshots the recap → shares with their best friend → growth
```

The loop is the product. Every screen serves it.

## 6. Screens in v1.0 (the 6-week core)

1. **Landing page** (`/`) — public; one screenshot of a child dashboard + one screenshot of a parent dashboard, no carousel, one CTA: "Start with your family."
2. **Sign up** (`/auth/signup`) — Supabase Auth; email + magic link, COPPA-safe (age 13+ on the parent only).
3. **Sign in** (`/auth/signin`) — same surface, "send me a link."
4. **Household setup** (`/onboarding/household`) — name your household, set your role (admin or parent), optionally invite a co-parent by email.
5. **Child setup** (`/onboarding/children`) — add up to three children: name, age, avatar (from a set of 12 we ship; no upload in v1). Children do not have their own logins in v1 — the parent device hands the phone over.
6. **Focus pillars** (`/onboarding/pillars`) — pick 2–3 of the 8. Copy explains: "This is what we'll point this season at — you can change it any time."
7. **Parent dashboard** (`/`) — household name, three "Family Growth Score" badges (one per focus pillar), one card per child (avatar, level, today's completion %), recent approvals queue, the "ask the AI coach" stub (button visible, says "v1.1 — coming soon"), Family Growth Score radar chart.
8. **Child dashboard** (`/kids/[childId]`) — avatar, level + XP ring, "today's quests" (3 cards, pillar-tinted), "this week's mission" (1 card), recent achievements strip (empty in v1 — placeholder copy: "Your first badge is coming. Keep completing quests."), one big "I did it" button per quest that flips it to "ready for approval."
9. **Quest detail** (`/kids/[childId]/quests/[questId]`) — title, pillar, "what counts as done" copy, XP reward, history (last 3 times this child did this quest type), "I did it" or "approve" depending on viewer.
10. **Household profile** (`/household`) — change name, change focus pillars (re-seeds next week's quests), add/remove children, manage co-parents, "delete household" (proper destructive confirm).
11. **Settings** (`/settings`) — account email, sign out. (Notifications + subscription land in v1.1.)

Eleven screens. No more. If a v1.0 ticket proposes a twelfth, it's wrong.

## 7. Data model (the v1 schema)

`households` · `parents` · `children` · `pillars` (enum, app-level) · `quests` · `quest_completions`

Full SQL lives in `docs/ARCHITECTURE.md`. The contract:

- A `household` `hasMany parents` and `hasMany children`.
- A `quest` has a `pillar`, an `xp_reward`, a `type` (`daily | weekly | monthly`), and either a `child_id` (assigned) or a `template_id` (in the seed library).
- A `quest_completion` is the system-of-record for XP: it has `child_id`, `quest_id`, `completed_at`, `approved_by` (parent id), `approved_at`, and an immutable `xp_awarded`.
- `Level = floor(totalXp / 100)` where `totalXp = sum(quest_completions.xp_awarded WHERE child_id = X AND approved_at IS NOT NULL)`. Levels are derived, never stored.
- Family Growth Score per pillar = a 0–100 function of (completion rate over the trailing 28 days, consistency = % of days with at least one completion, weighted by quest difficulty). Formula in `ARCHITECTURE.md §4.2`.

## 8. Gamification — what the rewards look like

- **Daily quest** = 5 XP. Three per child per day.
- **Weekly mission** = 50 XP. One per child per week, picked from a pillar in focus.
- **Monthly boss battle** = 250 XP. **Deferred to v1.1.** v1.0 mentions it on the dashboard but does not implement it — "Boss battle coming next month" placeholder card.
- **Level** = `floor(totalXP / 100)`. Visual: a 360° XP ring around the child's avatar that fills to the next level.
- **Streak** = consecutive days with at least one approved completion. Shown on the child dashboard as a small "🔥 N" — yes this is the one place an emoji earns its keep — and triggers a "you kept your streak!" toast on day 3, 7, 14, 30.
- **Achievement badges** — **deferred to v1.1.** v1.0 ships the empty state ("Your first badge is coming"). The v1.1 ticket implements 6 starter badges.

## 9. What v1.0 explicitly does NOT do

These get a placeholder on the surface and a v1.1 ticket in the backlog. No code in v1.0:

- AI Family Coach (the chat surface and the AI-generated quests). v1.0 quests come from a hand-written rule-based seed library mapped to age + pillar.
- Achievement badges with real criteria.
- Stripe subscriptions. v1.0 is free; the `subscription_tier` column exists in the schema with a default of `'free'`.
- OneSignal push notifications. Browsers ask for permission; we don't ask.
- PostHog analytics. We ship server-side basic event logging into a Supabase table (`events`) so v1.1 has data to feed PostHog.
- Marketplace, social feed, school integrations, external coaches, in-app messaging.

If a parent asks "where is the AI coach," the answer in v1.0 is: *"In two weeks. Right now we're proving the daily loop works for your family without it."*

## 10. Success criteria

A parent can:
1. Sign up
2. Create a household
3. Invite a co-parent (optional)
4. Add 1–3 children
5. Pick 2–3 focus pillars
6. See the first week's quests already seeded for each child
7. Hand the phone to a child, who completes a quest and taps "ready"
8. Approve it from their dashboard
9. See XP awarded + Family Growth Score update

…within **10 minutes** of landing on the homepage. Measured by a stopwatch on every Friday demo, every week of the 6-week build.

Beyond the stopwatch:
- **D1 retention** = % of parents who return on day 2. Target: ≥ 50%.
- **W1 retention** = % of parents whose family completes at least one quest in week 2. Target: ≥ 30%.
- **Parent NPS** at week 2 ("Would you recommend this to a friend right now?"). Target: ≥ 40.

## 11. Constraints (the contract)

- **Children's data is minimal.** First name, age, avatar selection, XP totals. No last name, no school, no photos, no location, no behavior history beyond quest completion. The Hard NOs in `AGENTS.md` enforce this.
- **No backend for the child.** v1.0 has no child login; the parent hands the phone over. v2 might add a PIN-gated child profile; v1 does not.
- **Mobile-first, PWA-shaped.** Installable on iOS and Android. Desktop is responsive but the daily loop is designed for one thumb.
- **One copy voice.** Warm, parent-respecting, never patronizing. Banned words live in `AGENTS.md` — "journey," "amazing," "exciting," "elevate," "unlock," "empower," "synergy."
- **No purple gradients on white.** No emoji-decorated headings. The aesthetic is Disney × Duolingo × Headspace — warm, generous, premium. See `docs/DESIGN.md`.

## 12. Open questions (decide before week 5)

- Do we ship one child profile per device or do we ship a "switch child" affordance from the parent device? (Leaning: switch on parent device.)
- Does the parent need to approve every quest, or do we trust the child after Level 5? (Leaning: always approve in v1.0; trust mode is v1.1.)
- Family Growth Score formula — keep the 28-day window or shrink to 14 to feel snappier? (Test in week 5 with the first family.)

The backlog answers the rest.

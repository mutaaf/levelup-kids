# Design — LevelUp Kids

The visual system, voice, and interaction rules. Treat this as the contract for every UI ticket. If a ticket's implementation would violate any rule below, the rule wins and the ticket gets reshaped.

## 1. Aesthetic direction

**Disney × Duolingo × Headspace** — warm, generous, *family* premium. Not enterprise, not school software, not crypto-bro, not toddler-app.

The mental model:
- **Disney** — characters with weight and warmth. Avatars that feel hand-drawn, not corporate-flat.
- **Duolingo** — the loop is the product. Daily, rewarding, missable in the best way.
- **Headspace** — the *tone* is the moat. Calm, grounded, never breathless.

The product respects parents. It doesn't shout "AMAZING!" at a kid who did their math. It says "you read for 20 minutes — that's three days in a row." The voice and the visual are one.

## 2. Color system

LevelUp Kids is a **warm light theme** by default, with a thoughtful dark theme as v1.1. The light theme is the "morning sunlight on the kitchen table" feeling — cream, not white; ink, not black.

### Tokens (lives in `src/styles/tokens.css`)

```css
:root {
  /* Surface */
  --surface-paper:      #FAF7F2;  /* the default page background — cream */
  --surface-card:       #FFFFFF;  /* lifted card surface */
  --surface-elevated:   #FFFFFF;  /* dialogs, popovers */
  --surface-tinted:     #F2EDE4;  /* secondary background; "kitchen counter" */

  /* Ink */
  --ink-primary:        #1F1B16;  /* warm near-black — never #000 */
  --ink-secondary:      #5C5448;
  --ink-muted:          #8A8275;
  --ink-inverse:        #FAF7F2;  /* on a dark surface */

  /* Brand — clay/terracotta, NOT purple-gradient AI bait */
  --brand-50:           #FBEFE9;
  --brand-500:          #D2562B;  /* the primary brand color */
  --brand-600:          #B0411E;
  --brand-900:          #4A1A0C;

  /* Pillar palette — every pillar gets a tint that matches the kind of child it makes */
  --pillar-scholar:     #B07A2B;  /* warm ochre — the library lamp */
  --pillar-athlete:     #4A7A3A;  /* moss green — the grass field */
  --pillar-builder:     #8A5A3A;  /* sawn-wood brown */
  --pillar-creator:     #C2528C;  /* rosewater — the paintbox */
  --pillar-leader:      #4A6B8C;  /* uniform blue — the captain's stripe */
  --pillar-character:   #6B4A8C;  /* dusk violet — the prayer hour */
  --pillar-explorer:    #2B7A6B;  /* river teal */
  --pillar-purpose:     #B0411E;  /* same as brand-600 — service is the point */

  /* Semantic */
  --success:            #3F7A3F;
  --warning:            #B07A2B;
  --danger:             #A8331F;

  /* Geometry */
  --radius-xs:          6px;
  --radius-sm:          10px;
  --radius-md:          16px;
  --radius-lg:          24px;
  --radius-pill:        999px;

  /* Shadow — soft, warm, never neon */
  --shadow-sm:          0 1px 2px rgba(31, 27, 22, 0.06);
  --shadow-md:          0 4px 12px rgba(31, 27, 22, 0.08);
  --shadow-lg:          0 16px 40px rgba(31, 27, 22, 0.10);
}
```

### Forbidden colors

- **Purple gradients on white.** The single most-overused AI-generic palette. Never.
- **Pure `#000` or `#FFF`.** Always slightly warm.
- **Pillar tints used decoratively outside the pillar context.** A scholar quest is ochre; a button that has nothing to do with scholar is never ochre.

## 3. Typography

Two faces. That's all.

| Role | Family | Why |
|---|---|---|
| Display (h1, hero numbers, level numbers) | **Fraunces** (variable, optical 9–144) | Warm, characterful serif. Has soft, friendly italics. Avoids the "Inter for everything" trap. |
| Body / UI | **Sohne** (or fallback: **Söhne**, then system sans) | Crisp, neutral, doesn't fight with Fraunces. If Sohne licensing is a blocker, the open fallback is **Public Sans** — NEVER Inter. |
| Mono (timestamps, XP counters, debug) | **JetBrains Mono** | Only used in three places — XP delta animations, the "+5 XP" pip, and the dev preview. |

**Banned families:** Inter, Roboto, Open Sans, Arial, anything system-default. They are the visual equivalent of "amazing!"

### Scale (mobile-first; desktop bumps via `clamp()`)

```
--text-display:  clamp(40px, 8vw, 64px)   /* hero, level numbers */
--text-h1:       clamp(28px, 5vw, 36px)
--text-h2:       clamp(22px, 4vw, 28px)
--text-h3:       18px
--text-body:     16px
--text-small:    14px
--text-pip:      12px                     /* the "+5 XP" callout */
```

Line-height is generous on display (1.1) and roomy on body (1.55).

## 4. Layout & motion

### Layout

- **Mobile-first.** Every page is designed for one thumb on a 390pt iPhone first. The parent dashboard and child dashboard are 100% functional in portrait without horizontal scroll.
- **Touch targets ≥ 44pt.** Always. The "approve" row on the parent dashboard is a big tappable card, not a tiny button.
- **One column of trust.** The child dashboard does not have a tab bar. The parent dashboard has one bottom nav with three slots (Home · Family · Settings) — only after the desktop breakpoint does a sidebar appear.
- **Cards have weight.** `--radius-md` (16px), `--shadow-sm` default, lifting to `--shadow-md` on hover/press.
- **Asymmetry over symmetry.** The hero on the parent dashboard puts the radar chart off-center; the child dashboard's XP ring is left-aligned with quests stacked right. Never a perfect 50/50 split.

### Motion

The product moves with intention. Three motion personas:

1. **Confirm** — quest completion. 240ms ease-out, with a soft "+5 XP" pip floating up from the button. The XP ring fills with a 600ms ease. Audio is silent in v1.0 (no sound effects yet — v1.1 ticket).
2. **Level up** — confetti is banned. Instead: the avatar grows 8%, the level number rolls (counter animation, 800ms), the XP ring resets to 0%. Calm pride, not casino.
3. **Approve** — parent taps "approve." The row collapses with a 280ms layout transition. The child's avatar (visible in the row) does a 4° tilt-and-return as a tiny "thank you."

Library: **Motion** (`motion/react`). CSS for everything that can be CSS. Reduced-motion respected — all of the above degrade to opacity-only fades.

## 5. Components — the v1.0 set

shadcn primitives, restyled with the tokens above. New components specific to LevelUp Kids:

### `<PillarBadge pillar="scholar" size="sm|md|lg" />`
Rounded-pill chip with the pillar tint as background and ink-primary text. Small icon glyph on the left. Used everywhere pillars are mentioned.

### `<XpRing childId={childId} size="sm|md|lg" />`
Circular SVG ring around the child's avatar. Fills with brand-500. Animates on XP change (Motion).

### `<LevelBadge level={12} />`
Small pill bottom-right of the avatar. Fraunces display number. Brand-500 background.

### `<StreakChip days={7} />`
The one place a flame glyph earns its keep. Inline next to the avatar on the child dashboard.

### `<QuestCard quest={...} state="idle|ready|approved" />`
The atomic unit. Title in body text, pillar badge top-right, XP pip bottom-right, big "I did it" button that morphs into "Waiting for approval" → "Approved + 5 XP".

### `<FamilyGrowthRadar focus={['scholar','athlete']} scores={...} />`
8-axis radar chart. Focus pillars are tinted with their pillar color; non-focus are greyed. Hovered axis shows the score number and the trailing 7-day delta. Library: a small in-house SVG component — no chart library bloat.

### `<ApprovalQueue items={...} />`
List of pending completions on the parent dashboard. Each row: child avatar + name, quest title, "Approve" + "Not yet." The "Not yet" path opens a tiny text box for a gentle reason.

### `<EmptyState illustration="firstWeek|noApprovals|noChildren" />`
Always pair empty states with a hand-drawn-style illustration (12 ship in v1.0; new illustrations are a v1.1 ticket).

## 6. Iconography

- **Glyphs:** Lucide for utility (close, chevron, check). NEVER Material Icons.
- **Pillar icons:** custom 24px SVGs shipping in `public/icons/pillars/`. Each is hand-drawn-feeling (slightly imperfect strokes), single-color, animatable.
- **Illustrations:** 12 ship in v1.0 in `public/illustrations/`. Hand-drawn, warm palette, family-of-five-across-the-spectrum representation. Each illustration is a `.svg` ≤ 60KB.

## 7. Voice & copy

The voice is the *moat*. The visual matters, but the copy is what makes a parent say "this gets it."

### Principles

1. **Speak to the parent like an adult.** They're a smart, busy person trying to raise a great kid. Not a "mama" or "dad-pal."
2. **Respect the child.** When the child sees copy, it's confident — "your quest" not "today's task!" — and warm without being saccharine.
3. **Name the moment, not the metric.** "You read three days in a row" beats "Streak: 3."
4. **One sentence beats a paragraph.** Always.

### Banned words (enforced by reviewer)

`journey · amazing · exciting · elevate · unlock · empower · synergy · revolutionize · seamless · effortless · transform`

### Copy patterns

| Surface | Don't | Do |
|---|---|---|
| Sign-up CTA | "Start your family's journey!" | "Start with your family." |
| Empty quest state | "No quests yet — let's get going!" | "Your first quests are seeded for tomorrow morning." |
| Approval prompt | "Awesome! Approve this quest?" | "Layla finished her reading quest. Approve?" |
| Level up | "Level up! You did amazing!" | "Layla is Level 6. The Athlete pillar carried the week." |
| Coach stub (v1.0) | "AI Coach coming soon!" | "The Family Coach lands in two weeks. Tell us what you want help with first — `[input]`." |

## 8. Dark mode (v1.1)

Out of scope for v1.0 but called out so the v1.0 design doesn't accidentally bake in light-only choices. Tokens above are scoped to `:root`; the v1.1 dark theme adds a `[data-theme="dark"]` block with paper/ink inverted and pillar tints shifted 10% saturated.

## 9. Accessibility

- **Contrast.** All body text on `--surface-paper` is `--ink-primary` (passes AAA). All "muted" copy uses `--ink-secondary` (passes AA at body size).
- **Touch.** All interactive elements ≥ 44pt.
- **Motion.** `prefers-reduced-motion: reduce` collapses every Motion animation to opacity fade only.
- **Screen reader.** The child dashboard's XP ring has an `aria-label` like "Layla is Level 6, 45 XP toward Level 7."
- **Color is not the only signal.** A pillar is always paired with its glyph icon and its name in copy. Color-blind parents must read the dashboard correctly.

## 10. Asset checklist (ticket 0001 ships the stubs)

- `public/avatars/avatar-01.svg` through `avatar-12.svg` — 12 hand-drawn warm-palette character avatars.
- `public/icons/pillars/*.svg` — 8 pillar icons.
- `public/illustrations/*.svg` — at least these in v1.0: `first-week.svg`, `no-approvals.svg`, `no-children.svg`, `coach-coming.svg`.
- `public/manifest.webmanifest` — PWA manifest with two app icons (192, 512).
- `public/apple-touch-icon.png` — iOS install icon.

## 11. The "no" list (enforced by the review agent)

If a PR introduces any of these, the reviewer requests changes:

- An Inter, Roboto, or Open Sans font reference.
- A purple gradient.
- A `bg-gradient-to-br from-purple-` Tailwind utility.
- An emoji in a heading or button label (the `🔥` streak chip and a hand-picked allow-list in `src/components/xp/StreakChip.tsx` are the only exceptions).
- A confetti animation.
- A "loading…" spinner without a skeleton state for surfaces that have known shape (every surface in v1.0 except the AI Coach stub has known shape).
- A "Coming soon ✨" anywhere.
- A copy block longer than 3 sentences on a dashboard card.

The design system is a living document but the *no* list is the contract.

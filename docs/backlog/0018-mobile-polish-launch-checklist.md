---
id: 0018
title: Mobile-first polish + desktop responsive QA + launch checklist
status: groomed
priority: P0
area: design
created: 2026-06-16
owner: gtm-innovation
---

## User story

As the founder running the week-6 launch demo with the first design-partner family, I want every surface in v1.0 to pass a launch checklist — mobile-first quality bar on iPhone 12 and a Pixel 7, desktop respectability on a 1440×900 viewport, illustrations swapped from placeholder to final, the warm-light visual system applied consistently, and the success-criteria stopwatch test passing under 10 minutes — so I can hand the phone to a family with confidence and not flinch at what they see.

## Why now (four lenses)

### Product Owner
0018 is the closer. Every prior ticket landed a feature; this one polishes the experience. The simplification: a checklist, not a feature.

### Stakeholder
The visual quality bar of the launch IS the visual quality bar of the product. If the parent dashboard looks like a default Next.js app at launch, no amount of v1.1 work recovers it.

### User (in the real moment of use)
Imran, on iPhone 12 mini (the smallest current iPhone), should feel: this is *premium*, this is *intentional*, this is for *me*.

### Growth
The launch is the first public surface area. The screenshot the first design-partner family sends to their friend is composed today.

## Acceptance criteria

This ticket is a CHECKLIST. Each box is a verifiable pass/fail.

### Visual

- [ ] Every screen uses the tokens from `src/styles/tokens.css`. No hardcoded hex anywhere in `src/components/`.
- [ ] No font-family reference to Inter, Roboto, Open Sans, system-ui in the rendered CSS (Lighthouse extra-rule).
- [ ] No `bg-gradient-to-*-purple-*` Tailwind class anywhere (grep gate in `lint`).
- [ ] No emoji in any heading or button label except `🔥` in `<StreakChip />` (grep gate).
- [ ] All 12 avatars (`public/avatars/avatar-NN.svg`) ship final art, each ≤ 12KB.
- [ ] All 8 pillar icons (`public/icons/pillars/*.svg`) ship final art.
- [ ] All 4 illustrations (`first-week.svg`, `no-approvals.svg`, `no-children.svg`, `coach-coming.svg`) ship final art.
- [ ] App icons (`public/icons/app-{192,512}.png` and the maskable variants) ship final art, on-brand cream + terracotta.

### Mobile

- [ ] Playwright `mobile-webkit` (iPhone 12 device descriptor) runs the success-criteria flow end-to-end with no horizontal scroll on any screen.
- [ ] Every interactive element measures ≥ 44pt × 44pt in the rendered viewport.
- [ ] The bottom nav stays above the iOS home-bar safe area (`padding-bottom: env(safe-area-inset-bottom)`).
- [ ] Inputs do NOT trigger zoom on focus (font-size ≥ 16px on text inputs).
- [ ] The landing-page hero composes correctly on 390pt iPhone 12 width.

### Desktop

- [ ] At 1440×900 the parent dashboard composes as the asymmetric layout in `docs/DESIGN.md §4`: radar top-right, child cards left two-thirds, sidebar replaces bottom nav.
- [ ] The child dashboard at desktop centers itself with a max-width of 720px — it should feel intentional, not stretched.

### Performance

- [ ] Landing page LCP < 1.8s (Lighthouse mobile throttled 4G).
- [ ] Parent dashboard TTI < 2.5s (Lighthouse mobile, authenticated fixture).
- [ ] Child dashboard TTI < 2.0s (Lighthouse mobile, authenticated fixture).
- [ ] Total JS shipped on the parent dashboard < 200KB gzipped (`@next/bundle-analyzer` check in CI).

### Accessibility

- [ ] AAA contrast on body text. Playwright + `@axe-core/playwright` smoke on the 5 main routes returns 0 violations.
- [ ] Every interactive element has an accessible name (verified by axe).
- [ ] `prefers-reduced-motion: reduce` degrades every Motion animation to opacity-only.
- [ ] `aria-label` on the XP ring reads "Layla is Level 6, 45 XP toward Level 7" via tested fixture.

### Voice

- [ ] vitest `tests/copy/banned-words.test.ts` scans every UI string from `src/` and every quest template — zero banned-words hits.
- [ ] Every empty state has hand-written copy, no Lorem Ipsum, no "Coming soon ✨."

### Launch checklist

- [ ] The success-criteria stopwatch flow (PRD §10) completes in under 10 minutes on a real iPhone, recorded on video, with a non-technical parent attempting it.
- [ ] `docs/LESSONS.md` has at least 5 entries logged by the agents since 0001 shipped (a soft assertion that the loop is producing memory).
- [ ] Vercel preview is live at `levelup-kids.vercel.app` with a `noindex` meta tag.
- [ ] Production domain `levelupkids.app` decision pending (founder-owned action item — record decision in this ticket's implementation log).

## Out of scope

- Native iOS / Android apps. v2.
- Internationalization. English only in v1.
- Dark mode. v1.1.
- Audio / sound design. v1.1.
- A "What's new" changelog screen. v1.1.

## Engineering notes

- Multiple sub-PRs are fine. Tag them all `polish/0018-*` and reference back to this ticket.
- The video of a real parent doing the stopwatch flow lives in `docs/launch-evidence/` — the file is not committed (too big); a placeholder `.md` references the cloud-storage link.
- New deps: `@axe-core/playwright`, `@next/bundle-analyzer`.

## Implementation log

(Appended by implementation-dev during execution.)

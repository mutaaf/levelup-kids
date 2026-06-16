---
id: 0017
title: PWA manifest + service worker + install prompt for iOS and Android
status: groomed
priority: P0
area: pwa
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (logged in, on the dashboard for the third time on his phone), I want a non-intrusive "Add LevelUp Kids to your Home Screen" prompt that disappears after I dismiss it and never comes back unless I want it — so installing the app feels like a choice the product offered respectfully, not a popup that ambushed me.

## Why now (four lenses)

### Product Owner
PWA install is the v1.0 native app substitute. The simplification: ONE prompt, on the third session, dismissable forever. No multi-step "install tutorial." iOS gets specific instructions (because Safari requires "Share → Add to Home Screen"); Android gets the native `beforeinstallprompt` event.

### Stakeholder
Installing the PWA is a high-intent signal — installed users have 3x the retention of browser-only users. The install also unlocks v1.1's OneSignal push (push only fires reliably on installed PWAs).

### User (in the real moment of use)
Imran has been using the app on his phone for two days. On his third session, a small banner at the bottom: "Add LevelUp Kids to your Home Screen so it opens like an app. [Install] [Not now]." He taps Install. iOS-Safari: a brief modal shows the 3-step "Share → Add to Home Screen" with a labeled screenshot of his own Safari toolbar. Android-Chrome: the native prompt opens. Done.

### Growth
An installed PWA is the foothold for the v1.1 push-notification ticket, the v1.2 seasonal-campaign push, and the "open the app three times before churn" lifecycle.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] `public/manifest.webmanifest` exists with: `name: "LevelUp Kids"`, `short_name: "LevelUp"`, `start_url: "/"`, `display: "standalone"`, `background_color: "#FAF7F2"`, `theme_color: "#D2562B"`, `icons: [192px, 512px, 192px maskable, 512px maskable]`.
- [ ] `public/apple-touch-icon.png` (180×180) ships in the warm aesthetic, not a blue default.
- [ ] `app/layout.tsx` injects `<link rel="manifest" href="/manifest.webmanifest" />` + `<meta name="theme-color" content="#D2562B" />` + the apple-touch-icon link.
- [ ] `public/sw.js` exists with: cache-first for `/_next/static/*`, network-first for `/api/*`, fallback page `/offline` for navigation requests when offline. Registered via `src/app/sw-register.tsx` on the (app) layout — not on the marketing layout.
- [ ] `/offline` page renders a calm "You're offline — your quests will sync when you reconnect." with the household name + child avatars cached from the last visit (cached via SW).
- [ ] `<InstallPrompt />` (`src/components/pwa/InstallPrompt.tsx`) renders on the parent dashboard:
  - [ ] Only on session count ≥ 3 (tracked in localStorage `lu_sessions`).
  - [ ] Hidden permanently after a "Not now" dismiss (localStorage `lu_install_dismissed_at`).
  - [ ] On Android-Chrome, captures `beforeinstallprompt` and calls `.prompt()` on tap.
  - [ ] On iOS-Safari, opens a modal showing a labeled screenshot of the Safari share button + Add to Home Screen step.
  - [ ] On already-installed (matchMedia `(display-mode: standalone)`), never shown.
- [ ] vitest: the session-count logic increments only once per real session (not per page nav).
- [ ] Playwright: in standalone-display mode (simulated via `--display-mode-override`), the install banner does not render.
- [ ] Lighthouse PWA score ≥ 90 on the landing page and the dashboard (run in CI smoke).
- [ ] An `events` row `name: 'pwa_installed'` writes when the app is opened in standalone mode for the first time. `name: 'install_prompt_shown'` when the banner is shown. `name: 'install_dismissed'` when dismissed.

## Out of scope

- Push notifications. v1.1 OneSignal ticket.
- An iOS App Store wrapper. v2.
- A Chrome Web Store listing. Out of scope.
- Background sync of completions. v1.1 if needed.
- Custom install copy per pillar / season. Standard copy.

## Engineering notes

- The service worker is hand-written, not Workbox (we own it explicitly).
- Manifest icons live in `public/icons/app-{192,512}.png` and `public/icons/app-{192,512}-maskable.png` — illustrator-quality. If the founder ships placeholder PNGs, the ticket can land as `groomed` and the polish ticket 0018 swaps to final.
- The InstallPrompt copy: "Add LevelUp Kids to your Home Screen so it opens like an app." Period. No "for the best experience!" exclamation.
- The iOS modal screenshot is `public/illustrations/ios-install.svg` — a simple two-frame illustration of Safari's share button and the "Add to Home Screen" row.
- New deps: none.
- Migration: none.

## Implementation log

(Appended by implementation-dev during execution.)

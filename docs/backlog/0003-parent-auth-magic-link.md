---
id: 0003
title: Parent sign-up + sign-in via Supabase Auth magic link
status: shipped
priority: P0
area: auth
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (a parent landing on `levelupkids.app` for the first time), I want to enter my email, get a magic link in 30 seconds, click it, and land on `/onboarding/household` with my Supabase session set — so I never have to remember a password to use a family app.

## Why now (four lenses)

### Product Owner
The smallest meaningful unit of value: a parent can sign up. Without it, no other v1 ticket has a user to test against. The simplification: no password, no "forgot password," no email verification step — magic link is the verification.

### Stakeholder
Magic-link auth is the privacy posture. No passwords stored means no password leak. No third-party social-login means no shared identity graph. The decision to skip Google/Apple sign-in in v1 is intentional; we revisit only if onboarding friction data demands it.

### User (in the real moment of use)
Imran is on the train at 8am, signs up on his phone. He gets the email by the time he's switched to Gmail. He taps; he's in. If it takes more than 30 seconds his curiosity dies and he closes the tab.

### Growth
Sign-up that works in 30 seconds becomes the "I just signed up — try it" message Imran can text Sara at 8:01am. Friction here is friction across the whole funnel.

## Acceptance criteria

Each box maps 1:1 to a vitest or Playwright scenario.

- [ ] Playwright (`e2e/auth.spec.ts`): visiting `/auth/signup`, entering a valid email, clicking "Send me a link" shows the "check your email" confirmation copy (Fraunces h2: "Check your inbox.") and the button enters a loading state for ≥ 400ms.
- [ ] Playwright: visiting `/auth/signin` shows the same form with copy that adapts ("Welcome back.") — the surface is one component with a `mode` prop.
- [ ] vitest (`tests/auth/callback.test.ts`): a GET to `/auth/callback` with a valid `code` query param exchanges it for a session via `supabase.auth.exchangeCodeForSession()` and redirects to `/onboarding/household` for a new user.
- [ ] vitest: a returning user (whose `parents` row already exists with `household_id IS NOT NULL`) is redirected from `/auth/callback` to `/` (parent dashboard).
- [ ] vitest: the `/auth/callback` route is the only public route besides `/`, `/auth/signin`, `/auth/signup`, `/privacy`, `/terms`. Middleware (`src/lib/supabase/middleware.ts`) enforces this — any other unauthenticated request 302s to `/auth/signin?next=<requested>`.
- [ ] Email copy ships in `supabase/config.toml` (the `[auth.email.template.magic_link]` block) and matches the LevelUp Kids voice — no "amazing," no "exciting." Subject: "Your LevelUp Kids sign-in link." Body opens with "Tap to sign in. The link expires in 60 minutes." No emojis. No marketing footer.
- [ ] On successful first sign-in (no `parents` row yet), the callback route inserts a `parents` row with `id = auth.uid()`, `email`, `name` left blank, and `household_id = null`. (The household and the name are collected in 0004.)
- [ ] vitest covers the failure modes: invalid email format → form blocks submit + inline error; rate-limited magic-link request → toast "We just sent a link a moment ago. Check your inbox." (using Supabase's built-in rate limit signal).
- [ ] The sign-in form is keyboard-only-navigable. Tab order: email → submit. Enter submits.
- [ ] No password field exists anywhere in the codebase. `grep -r 'type="password"' src/` returns nothing.

## Out of scope

- OAuth providers (Google, Apple). Future ticket.
- Two-factor auth. Magic link is the factor.
- Account deletion flow (lives in `/settings` per the v1 PRD).
- Profile photo for the parent (parent has no avatar in v1; children do).
- Email verification distinct from magic link.

## Engineering notes

- Use the App-Router-compatible `@supabase/ssr` package's helpers — `createServerClient` in `src/lib/supabase/server.ts`, `createBrowserClient` in `src/lib/supabase/browser.ts`.
- The `/auth/callback` route is a Route Handler at `src/app/auth/callback/route.ts`. After session exchange, redirect via `NextResponse.redirect()` to the next URL.
- Middleware: `src/lib/supabase/middleware.ts` defines `publicPaths = ['/', '/auth/signin', '/auth/signup', '/auth/callback', '/privacy', '/terms']`. Every other path requires `auth.getUser()` to return a user.
- `src/app/auth/signin/page.tsx` and `signup/page.tsx` are server components that render a shared `<AuthForm mode="signup" | "signin" />` client component.
- shadcn primitives used: `Input`, `Label`, `Button`, `Card`.
- Voice: the AuthForm's "Send me a link" button text is exactly that — never "Get started," never "Sign up free."
- New deps: `@supabase/ssr` if not already installed in 0001.
- Migration: none.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all from 0001's `.env.example`.

## Implementation log

- 2026-06-17 [implementation-dev] Picked up on `feat/0003-parent-auth-magic-link`. Plan: shared `<AuthForm mode>` client component, server `/auth/signin` and `/auth/signup` pages, `/auth/callback` Route Handler doing `exchangeCodeForSession()` + first-time `parents` upsert (id = auth.uid(), household_id = null), `src/middleware.ts` enforcing the public-path allowlist + 302-to-signin?next= for everything else. `supabase/config.toml` gets the `[auth.email.template.magic_link]` block with the voice-compliant subject + body. Tests-first: vitest `tests/auth/callback.test.ts` covers the route handler, middleware allowlist, parents-row upsert shape, password-field-absence grep, and config.toml copy; Playwright `e2e/auth.spec.ts` covers the form copy + loading state for both modes. Also folding in the 0002 status drift on this branch (ticket file + README row).
- 2026-06-17 [implementation-dev] @supabase/ssr already on the dep list from 0001 — no new top-level dep needed.

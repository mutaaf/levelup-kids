---
id: 0005
title: Invite a co-parent via email link
status: groomed
priority: P0
area: household
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (admin parent of "The Aziz Family"), I want to enter Sara's email and tap "Invite Sara," so that she receives a one-tap link, signs in, and lands directly on the parent dashboard already attached to our household with `role = 'parent'` — without ever creating a separate household.

## Why now (four lenses)

### Product Owner
Co-parent activation is a top-three retention lever (`docs/GTM.md §7`). The smallest meaningful unit of value: a one-input form on the household-creation step, an email sent server-side, a join flow that ends on the dashboard. No reciprocal-approval step in v1 — the inviter is the admin; the invitee is a parent.

### Stakeholder
A household with two active parents is the moat. A household with one is a churn risk. Building co-parent invite in v1.0 (vs v1.1) doubles the chance that the design-partner families have both parents in the app by week 2.

### User (in the real moment of use)
Imran is on the train. He's already typed "The Aziz Family" + his name in 0004. The next surface offers an optional "Invite Sara" — one field, one tap. He skips it. He continues. The dashboard surfaces the same invite affordance as a top card so he can come back to it on the couch tonight.

### Growth
"Invite your co-parent" is the only viral surface in v1.0 — and it's the highest-trust one (he's inviting his actual spouse). The invite email is the first impression Sara has of LevelUp Kids; the copy and the path back must be flawless.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: on `/onboarding/household` after the household is created, an inline "Invite a co-parent" section appears with one email input and a button "Send the invite." A "Skip for now" link is equally visible — neither is the default.
- [ ] vitest: a server action `inviteCoParent({ email })` creates a row in a new `household_invites` table (`id`, `household_id`, `email`, `token` (random 32-byte url-safe), `invited_by`, `created_at`, `expires_at = now + 7 days`, `accepted_at` nullable) and triggers an email send.
- [ ] vitest: an invite cannot be sent to an email that already belongs to a parent of the same household (returns "already in your household").
- [ ] vitest: an invite cannot be sent more than 3 times in a rolling 24-hour window to the same email from the same household (rate-limit check); attempting returns "we already sent this invite — Sara should check her inbox."
- [ ] Email content lives in a single template in `src/lib/email/invite.ts` (string + html builders). Subject: "Imran invited you to the Aziz Family on LevelUp Kids." Body: 2 short sentences + a single CTA button "Join the family." No emojis. No marketing footer.
- [ ] Email is sent via Supabase's outbound email (in v1.0 we use the same SMTP Supabase Auth uses; the v1.1 ticket migrates to a transactional service if needed). `events` row: `name: 'coparent_invited'`.
- [ ] Playwright: visiting `/invite/[token]` (a new public route) shows a "Join the Aziz Family" surface with the inviter's first name + a "Sign in to join" button.
- [ ] vitest: visiting `/invite/[token]` while signed in as a user with NO `household_id` accepts the invite (sets the parent's `household_id` + `role = 'parent'` + `name` left blank for now, marks the invite `accepted_at`) and redirects to `/onboarding/children` if the household has no children yet, else to `/`.
- [ ] vitest: visiting `/invite/[token]` while signed in as a user with a DIFFERENT `household_id` shows an explicit error: "You're already in another household. Leave it from Settings first." (No silent move.)
- [ ] vitest: an expired token returns a clear "this invite has expired — ask Imran to send a new one" surface, not a generic 404.
- [ ] The parent dashboard (whatever placeholder exists pre-0014) surfaces the same invite form when the household has only one parent.

## Out of scope

- More than one co-parent in v1. The schema supports many parents per household; the UI only invites one in onboarding. The dashboard surface can invite more in v1.1.
- Permissions distinct from admin/parent. Both roles can do everything in v1.
- A "decline invite" button (the user just doesn't click). The expiry handles it.
- Native sharing (iOS share sheet) of the invite link. Future ticket.

## Engineering notes

- New table: `household_invites`. Migration `supabase/migrations/0003_household_invites.sql`. RLS: a parent can SELECT only their household's invites; only the inviter can INSERT.
- `/invite/[token]` is in the public-paths allow-list in middleware.
- Email helper: `src/lib/email/invite.ts`. In v1.0 send via `supabase.auth.admin.inviteUserByEmail` is the wrong tool (it creates an auth user); instead, send via the same SMTP credentials Supabase Auth uses by calling a Supabase Edge Function `send-invite-email` OR by setting up Resend if Resend env vars are present in `.env.local`. Prefer the Edge Function path so we keep zero new client deps in v1.0.
- The token is 32 random url-safe bytes (`crypto.randomBytes(32).toString('base64url')`).
- Server action lives in `src/app/onboarding/household/actions.ts` alongside 0004's.
- Privacy/security surface change: yes — we now send email to an address that may not be a user. The opt-in is the inviter; the privacy page should mention "we send the invite emails the inviter asks us to send."

## Implementation log

(Appended by implementation-dev during execution.)

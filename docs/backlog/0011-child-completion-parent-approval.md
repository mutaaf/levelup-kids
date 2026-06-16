---
id: 0011
title: Child marks quest ready and parent approves from the dashboard queue
status: groomed
priority: P0
area: quests
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Layla (10), I want to tap "I did it" on a quest card on my dashboard so the card flips to "Waiting for approval" and shows up in my parent's queue; and as Sara (parent), I want to tap "Approve" from the dashboard queue so the quest awards Layla XP and the row collapses with a 4° avatar tilt — closing the daily loop.

## Why now (four lenses)

### Product Owner
This is the loop's hinge. Without approval, no XP. Without XP, no level. Without level, no Family Growth Score. The smallest meaningful unit of value: child taps "I did it" → server writes `quest_completions` row with `completed_at = now`, `approved_by = null` → parent taps "Approve" → server updates `approved_by`, `approved_at`, `xp_awarded` in one transaction.

### Stakeholder
The approval flow is the trust mechanism. v1.0 has *no* child login; the parent's session is the trust boundary. The approve action proves the parent saw it. The "not yet" path (a polite re-prompt) handles the "she didn't really read for 20 minutes" case without making it adversarial.

### User (in the real moment of use)
Layla taps a big button. Sara, 10 minutes later, taps another big button. The two taps are the whole product on its best day.

### Growth
The "approve three quests in one motion" affordance (a stack of pending rows the parent can swipe-approve) is the future v1.1 enhancement. v1.0 ships one-tap-per-row; v1.1 explores batch.

## Acceptance criteria

Each box maps 1:1 to a vitest or Playwright scenario.

- [ ] Playwright: on the child dashboard (placeholder ok if 0015 hasn't shipped), a quest card has a big primary button "I did it" in the idle state. Tapping it (a) calls server action `markQuestReady(questId)`, (b) animates the button to the "Waiting for approval" pill (240ms transition), (c) inserts a `quest_completions` row with `completed_at = now`, `approved_by = null`, `xp_awarded = 0`.
- [ ] vitest: `markQuestReady` is idempotent. Tapping it twice creates only one `quest_completions` row (the `unique(quest_id)` constraint enforces it; the server action handles the constraint-violation as a no-op success).
- [ ] vitest: `markQuestReady` requires the child belongs to the calling parent's household (RLS-enforced; the action just calls the user-context client).
- [ ] Playwright: on the parent dashboard, an `<ApprovalQueue />` shows one row per pending `quest_completions` (oldest first). Each row: child avatar + first name, quest title, pillar badge, "Approve" + "Not yet" buttons.
- [ ] Playwright: tapping "Approve" calls server action `approveQuest(completionId)`, the row collapses in 280ms, the child's avatar in the row tilts 4° and returns, and an inline "+5 XP" pip floats above the row for 600ms.
- [ ] vitest: `approveQuest` (a) updates the `quest_completions` row with `approved_by = auth.uid()`, `approved_at = now`, `xp_awarded = quest.xp_reward`, (b) returns the new totalXp for the child, (c) is idempotent (re-call returns the same row unchanged).
- [ ] vitest: `approveQuest` is rejected by RLS if the calling parent is not in the same household as the quest's child.
- [ ] Playwright: tapping "Not yet" opens a small popover with a textarea ("Tell Layla what to try — keep it warm.") and a "Send" button. Submitting writes a `events` row `name: 'quest_not_yet'`, `props: { reason }`, and removes the row from the queue without inserting an approval. The quest stays in the child's dashboard as idle for them to retry.
- [ ] vitest: `markQuestReady` writes an `events` row `name: 'quest_marked_ready'`. `approveQuest` writes `name: 'quest_approved', props: { pillar, xp }`.
- [ ] An approved quest cannot be un-approved in v1.0 (parents asking for that → v1.1 ticket).

## Out of scope

- Auto-approve for trusted kids (Level 5+). v1.1.
- Batch-approve (swipe the stack). v1.1.
- Approve from a notification. v1.1 OneSignal ticket.
- Approval streak rewards.
- Photo / voice evidence on the completion. Hard NO in v1 (privacy).
- Editing a quest after it's been completed.

## Engineering notes

- Server actions in `src/app/api/quests/actions.ts` (or `app/(app)/actions.ts`). Use `createServiceSupabase()` to bypass RLS in the action body BUT explicitly check `parent.household_id === child.household_id` before the write.
- `<QuestCard />` (`src/components/quests/QuestCard.tsx`) has three states managed by a discriminated union: `idle | ready | approved`. The transition animations use Motion's `<AnimatePresence />`.
- `<ApprovalQueue />` (`src/components/quests/ApprovalQueue.tsx`) wraps a list of `<ApprovalRow />` items. Uses Motion's `layout` prop on each row for the collapse animation.
- The "+5 XP" pip is a small absolutely-positioned `<XpPip amount={5} />` that animates `y: -32, opacity: [0, 1, 0]` over 600ms then unmounts.
- New deps: none (motion + lucide already installed by 0001).
- Migration: none.
- Privacy/security surface change: the approval row exposes the child's first name to the parent — that's already permitted by RLS.

## Implementation log

(Appended by implementation-dev during execution.)

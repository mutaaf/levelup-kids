// Single email transport boundary — the rest of the app calls sendEmail()
// without knowing it's Resend underneath. Falls back to a no-op log when
// RESEND_API_KEY is missing (lets local dev / preview deploys boot without
// the secret) so callers don't need to special-case dev.

import { Resend } from "resend";

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  // Plain-text fallback. If omitted we strip tags from html for the alt body.
  text?: string;
  // Replaces the per-call from address. Defaults to LEVELUP_FROM_EMAIL.
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from =
    args.from ??
    process.env.LEVELUP_FROM_EMAIL ??
    "LevelUp Kids <hello@levelupkids.app>";
  if (!key) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping send",
      { to: args.to, subject: args.subject },
    );
    return { ok: false, error: "RESEND_API_KEY not set", skipped: true };
  }
  const client = new Resend(key);
  const { data, error } = await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text ?? stripHtml(args.html),
  });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Resend returned no id" };
  }
  return { ok: true, id: data.id };
}

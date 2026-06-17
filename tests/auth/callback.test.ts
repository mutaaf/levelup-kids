// Ticket 0003 — Parent sign-up + sign-in via Supabase Auth magic link.
//
// Each `it()` here corresponds 1:1 to one acceptance-criteria checkbox in
// docs/backlog/0003-parent-auth-magic-link.md. The Playwright spec at
// e2e/auth.spec.ts covers the AC items that need a real browser (loading
// state, mode-switching copy). Everything else lives here.
//
// Mocking discipline (per the ship prompt):
//   - We MAY mock @supabase/ssr / @supabase/supabase-js at the unit-test
//     boundary because the route handler's interesting logic is its branch
//     decision, not the network call.
//   - We do NOT mock Supabase in the e2e suite — that runs against the live
//     local Supabase in CI (AGENTS.md non-negotiable #1).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  PUBLIC_PATHS,
  isPublicPath,
  redirectForPath,
} from "@/lib/supabase/middleware";
import {
  decideCallbackDestination,
  handleAuthCallback,
  type ParentRecord,
} from "@/app/auth/callback/handler";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

/* ---- middleware: the public-path allowlist ----------------------------- */

describe("middleware public-path allowlist", () => {
  it("exposes exactly the documented public paths", () => {
    // Per AC: `/`, `/auth/signin`, `/auth/signup`, `/auth/callback`,
    // `/privacy`, `/terms` are the ONLY routes an unauthenticated visitor
    // is allowed to reach. Any drift here is a privacy regression.
    expect([...PUBLIC_PATHS].sort()).toEqual(
      [
        "/",
        "/auth/callback",
        "/auth/signin",
        "/auth/signup",
        "/privacy",
        "/terms",
      ].sort(),
    );
  });

  it("treats each public path as public regardless of trailing slash", () => {
    for (const p of PUBLIC_PATHS) {
      expect(isPublicPath(p)).toBe(true);
      expect(isPublicPath(p + "/")).toBe(true);
    }
  });

  it("treats a protected path as non-public", () => {
    expect(isPublicPath("/onboarding/household")).toBe(false);
    expect(isPublicPath("/kids/42")).toBe(false);
    expect(isPublicPath("/api/things")).toBe(false);
  });

  it("redirects an unauthenticated request to /auth/signin?next=<requested>", () => {
    const r = redirectForPath({
      pathname: "/onboarding/household",
      isAuthenticated: false,
    });
    expect(r).toEqual({
      kind: "redirect",
      location: "/auth/signin?next=%2Fonboarding%2Fhousehold",
    });
  });

  it("passes through an authenticated request on a protected path", () => {
    const r = redirectForPath({
      pathname: "/onboarding/household",
      isAuthenticated: true,
    });
    expect(r).toEqual({ kind: "pass" });
  });

  it("passes through any request on a public path (no infinite redirect)", () => {
    expect(
      redirectForPath({ pathname: "/auth/signin", isAuthenticated: false }),
    ).toEqual({ kind: "pass" });
    expect(
      redirectForPath({ pathname: "/auth/callback", isAuthenticated: false }),
    ).toEqual({ kind: "pass" });
    expect(
      redirectForPath({ pathname: "/", isAuthenticated: false }),
    ).toEqual({ kind: "pass" });
  });

  it("preserves query string in the `next` parameter", () => {
    const r = redirectForPath({
      pathname: "/kids/abc",
      search: "?day=mon",
      isAuthenticated: false,
    });
    expect(r).toEqual({
      kind: "redirect",
      location: "/auth/signin?next=%2Fkids%2Fabc%3Fday%3Dmon",
    });
  });
});

/* ---- /auth/callback: branch logic on parents-row state ----------------- */

describe("/auth/callback destination decision", () => {
  it("redirects a brand-new user (no parents row) to /onboarding/household", () => {
    const dest = decideCallbackDestination({ parents: null });
    expect(dest).toBe("/onboarding/household");
  });

  it("redirects a returning user with a household to /", () => {
    const parents: ParentRecord = {
      id: "00000000-0000-0000-0000-000000000001",
      household_id: "00000000-0000-0000-0000-000000000099",
    };
    expect(decideCallbackDestination({ parents })).toBe("/");
  });

  it("redirects a user with a parents row but null household_id back into onboarding", () => {
    const parents: ParentRecord = {
      id: "00000000-0000-0000-0000-000000000001",
      household_id: null,
    };
    expect(decideCallbackDestination({ parents })).toBe(
      "/onboarding/household",
    );
  });

  it("falls back to /auth/signin?error=… when no code is present", async () => {
    const result = await handleAuthCallback({
      url: new URL("http://localhost:3000/auth/callback"),
      exchangeCode: async () => {
        throw new Error("should not be called when code is absent");
      },
      loadParents: async () => null,
      upsertParents: async () => {
        throw new Error("should not be called when code is absent");
      },
    });
    expect(result.kind).toBe("redirect");
    if (result.kind === "redirect") {
      expect(result.location.startsWith("/auth/signin?error=")).toBe(true);
    }
  });

  it("on first sign-in, inserts a parents row with id = auth.uid(), null household_id, blank name", async () => {
    const upserts: Array<{
      id: string;
      email: string;
      name: string;
      household_id: string | null;
    }> = [];
    const result = await handleAuthCallback({
      url: new URL("http://localhost:3000/auth/callback?code=abc"),
      exchangeCode: async () => ({
        user: {
          id: "00000000-0000-0000-0000-000000000042",
          email: "imran@example.com",
        },
      }),
      loadParents: async () => null,
      upsertParents: async (row) => {
        upserts.push(row);
      },
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toEqual({
      id: "00000000-0000-0000-0000-000000000042",
      email: "imran@example.com",
      name: "",
      household_id: null,
    });
    expect(result).toEqual({
      kind: "redirect",
      location: "/onboarding/household",
    });
  });

  it("does NOT re-upsert parents on a returning sign-in", async () => {
    const upserts: Array<unknown> = [];
    const result = await handleAuthCallback({
      url: new URL("http://localhost:3000/auth/callback?code=xyz"),
      exchangeCode: async () => ({
        user: {
          id: "00000000-0000-0000-0000-000000000042",
          email: "imran@example.com",
        },
      }),
      loadParents: async () => ({
        id: "00000000-0000-0000-0000-000000000042",
        household_id: "00000000-0000-0000-0000-000000000099",
      }),
      upsertParents: async (row) => {
        upserts.push(row);
      },
    });
    expect(upserts).toHaveLength(0);
    expect(result).toEqual({ kind: "redirect", location: "/" });
  });

  it("honors a safe ?next= override only when it is a same-origin path", async () => {
    // Returning user, but they were intercepted at /kids/abc and we appended
    // ?next=/kids/abc when redirecting to signin. After the callback, send
    // them to the original path instead of /.
    const result = await handleAuthCallback({
      url: new URL(
        "http://localhost:3000/auth/callback?code=z&next=%2Fkids%2Fabc",
      ),
      exchangeCode: async () => ({
        user: {
          id: "00000000-0000-0000-0000-000000000042",
          email: "imran@example.com",
        },
      }),
      loadParents: async () => ({
        id: "00000000-0000-0000-0000-000000000042",
        household_id: "00000000-0000-0000-0000-000000000099",
      }),
      upsertParents: async () => undefined,
    });
    expect(result).toEqual({ kind: "redirect", location: "/kids/abc" });
  });

  it("rejects an open-redirect attempt in ?next= and falls back to the default", async () => {
    const result = await handleAuthCallback({
      url: new URL(
        "http://localhost:3000/auth/callback?code=z&next=https%3A%2F%2Fevil.example.com%2Fhack",
      ),
      exchangeCode: async () => ({
        user: {
          id: "00000000-0000-0000-0000-000000000042",
          email: "imran@example.com",
        },
      }),
      loadParents: async () => ({
        id: "00000000-0000-0000-0000-000000000042",
        household_id: "00000000-0000-0000-0000-000000000099",
      }),
      upsertParents: async () => undefined,
    });
    expect(result).toEqual({ kind: "redirect", location: "/" });
  });
});

/* ---- supabase/config.toml: magic-link email copy ----------------------- */

describe("supabase/config.toml magic_link template", () => {
  const text = readFileSync(join(REPO_ROOT, "supabase", "config.toml"), "utf8");

  // Extract the [auth.email.template.magic_link] table, stopping at the next
  // [section] header. Tolerant of leading whitespace.
  function extractSection(name: string): string {
    const start = text.indexOf(`[${name}]`);
    if (start === -1) return "";
    const rest = text.slice(start + name.length + 2);
    const nextHeader = rest.search(/\n\[[^\]]+\]/);
    return nextHeader === -1 ? rest : rest.slice(0, nextHeader);
  }

  it("defines the [auth.email.template.magic_link] block", () => {
    expect(text).toMatch(/\[auth\.email\.template\.magic_link\]/);
  });

  it("uses the LevelUp Kids voice subject", () => {
    const section = extractSection("auth.email.template.magic_link");
    expect(section).toMatch(/subject\s*=\s*"Your LevelUp Kids sign-in link\."/);
  });

  it("body opens with the documented copy and avoids banned words and emoji", () => {
    const section = extractSection("auth.email.template.magic_link");
    // The body is either inline `content = "..."` or referenced via
    // `content_path = "./templates/magic_link.html"`. Resolve to the actual
    // text either way.
    let body = "";
    const inline = section.match(/content\s*=\s*"([\s\S]*?)"\s*(?:\n|$)/);
    const ref = section.match(/content_path\s*=\s*"([^"]+)"/);
    if (inline && inline[1] !== undefined) {
      body = inline[1];
    } else if (ref && ref[1] !== undefined) {
      // supabase resolves content_path relative to the project root (where
      // you run `supabase start`), not relative to the supabase/ directory.
      // Strip the leading `./` and resolve from REPO_ROOT.
      const resolved = ref[1].replace(/^\.\//, "");
      body = readFileSync(join(REPO_ROOT, resolved), "utf8");
    } else {
      throw new Error(
        "magic_link template has neither `content` nor `content_path`",
      );
    }
    expect(body).toMatch(/Tap to sign in\. The link expires in 60 minutes\./);

    // Voice rules (AGENTS.md non-negotiable #7).
    const banned = [
      "journey",
      "amazing",
      "exciting",
      "elevate",
      "unlock",
      "empower",
      "synergy",
      "revolutionize",
      "seamless",
      "effortless",
      "transform",
    ];
    for (const word of banned) {
      expect(body.toLowerCase()).not.toContain(word);
    }
    // No emoji — match the broad Unicode emoji ranges + the streak fire
    // (the single allow-listed exception is the StreakChip, not email).
    // Exclude basic ASCII + Latin-1 + standard punctuation.
    const emojiPattern =
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    expect(emojiPattern.test(body)).toBe(false);
  });
});

/* ---- "no password field anywhere" grep --------------------------------- */

describe("password-field absence", () => {
  it("no `type=\"password\"` appears anywhere under src/", () => {
    const hits: string[] = [];
    walk(join(REPO_ROOT, "src"), (file) => {
      if (!/\.(tsx?|jsx?|css|html)$/.test(file)) return;
      const text = readFileSync(file, "utf8");
      if (/type\s*=\s*"password"/.test(text)) hits.push(file);
    });
    expect(hits, hits.join("\n")).toEqual([]);
  });
});

function walk(root: string, visit: (file: string) => void): void {
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, visit);
    else visit(p);
  }
}

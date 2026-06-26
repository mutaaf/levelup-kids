import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Regression guard.
//
// 2026-06-24: /settings threw `o.map is not a function` at load because
// ManageKidsCard imported `AVAILABLE_AVATARS` (a plain array) from a
// "use server" module. Next.js wraps every export from "use server"
// files as an async server-action reference at the client boundary, so
// plain constants arrive on the client as FUNCTIONS, not values.
//
// This test fails CI if anyone exports a non-async value from a "use
// server" module again. Only async functions and types are safe.

const REPO_ROOT = join(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip the build artifacts directory and node_modules if either
      // ever sneaks under src/.
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (
      st.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx"))
    ) {
      out.push(full);
    }
  }
  return out;
}

const FIRST_LINE_USE_SERVER = /^\s*(?:["']use server["']\s*;?\s*)/m;

// Captures the IDENTIFIER + the start of what follows the "=" for
// `export const|let|var X = ...`. We allow `async function ...` and any
// generator/arrow expression. Anything else is presumed to be a value.
const EXPORT_DECL_RE =
  /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?\s*=\s*(.*)$/gm;

// Functional forms that are safe (server actions). Anything else is a
// value export and will break the client boundary.
const SAFE_VALUE_RE = /^\s*(?:async\s+function\b|async\s*\(|async\s*function\*\b)/;

function offendingExports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  // Quickly skip non-"use server" files. We allow the directive to be
  // preceded by other "use server" lines via the m flag above.
  if (!FIRST_LINE_USE_SERVER.test(text.split(/\n/).slice(0, 3).join("\n"))) {
    return [];
  }

  // function and async function declarations are fine — they get
  // wrapped, callers await them. Reject only `export const X = …` when
  // RHS is not an async function/arrow.
  const offenders: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = EXPORT_DECL_RE.exec(text)) !== null) {
    const name = m[1] ?? "";
    const rhs = m[2] ?? "";
    if (!SAFE_VALUE_RE.test(rhs)) {
      offenders.push(name);
    }
  }
  return offenders;
}

describe("'use server' modules export only async functions + types", () => {
  it("no plain value exports from 'use server' files", () => {
    const files = walk(SRC);
    const breakers: string[] = [];
    for (const f of files) {
      const bad = offendingExports(f);
      if (bad.length === 0) continue;
      breakers.push(`${relative(REPO_ROOT, f)}: ${bad.join(", ")}`);
    }
    expect(
      breakers,
      `'use server' files may only export async functions and types. ` +
        `Move plain constants to a sibling module (see docs comment at the ` +
        `top of src/app/settings/child-actions.ts).\n\nOffenders:\n${breakers.join("\n")}`,
    ).toEqual([]);
  });
});

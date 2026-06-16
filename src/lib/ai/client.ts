// Single AI boundary for the whole app. v1.0 stubs the surface; ticket 0020
// wires Anthropic primary + OpenAI fallback. Outside src/lib/ai/, NO file may
// `import Anthropic from "@anthropic-ai/sdk"` — that breaks provider failover
// and cost telemetry. AGENTS.md non-negotiable #4.

export type CallAIRole = "system" | "user" | "assistant";

export interface CallAIMessage {
  role: CallAIRole;
  content: string;
}

export interface CallAIOptions {
  /** Logical model name (e.g. `coach`, `quest-author`); maps to a provider model in v1.1. */
  task?: string;
  messages: CallAIMessage[];
  /** Hard ceiling on output tokens; v1.1 enforces. */
  maxTokens?: number;
  /** 0–1 sampling temperature; v1.1 enforces. */
  temperature?: number;
}

export interface CallAIResult {
  text: string;
  provider: "anthropic" | "openai";
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

const NOT_IMPLEMENTED = "not-implemented-in-v1.0";

/** Free-text AI call. Throws in v1.0 — boundary only. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  throw new Error(NOT_IMPLEMENTED);
}

/** JSON-mode AI call returning a validated payload of type T. Throws in v1.0. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callAIWithJSON<T>(options: CallAIOptions): Promise<T> {
  throw new Error(NOT_IMPLEMENTED);
}

// Single AI boundary for the whole app. Outside src/lib/ai/, NO file may
// `import Anthropic from "@anthropic-ai/sdk"` — that breaks provider failover
// and cost telemetry. AGENTS.md non-negotiable #4.

import Anthropic from "@anthropic-ai/sdk";

export type CallAIRole = "system" | "user" | "assistant";

export interface CallAIMessage {
  role: CallAIRole;
  content: string;
}

export interface CallAIOptions {
  /** Logical model name (e.g. `coach`, `quest-author`); maps to a provider model. */
  task?: string;
  messages: CallAIMessage[];
  /** Hard ceiling on output tokens. */
  maxTokens?: number;
  /** 0–1 sampling temperature. */
  temperature?: number;
  /** Per-call override (household BYOK). When set, ANTHROPIC_API_KEY env is ignored. */
  apiKey?: string;
}

export interface CallAIResult {
  text: string;
  provider: "anthropic" | "openai";
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Free-text AI call. Anthropic primary; OpenAI fallback is the v1.1
 *  hardening ticket — not yet wired. */
export async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  const apiKey = options.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No Anthropic API key. Add yours in Settings → AI Family Coach, or set ANTHROPIC_API_KEY for the whole project.",
    );
  }

  const client = new Anthropic({ apiKey });
  const systemBlocks = options.messages.filter((m) => m.role === "system");
  const turnMessages = options.messages.filter((m) => m.role !== "system");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    system:
      systemBlocks.length > 0
        ? systemBlocks.map((b) => b.content).join("\n\n")
        : undefined,
    messages: turnMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return {
    text,
    provider: "anthropic",
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/** JSON-mode AI call returning a validated payload of type T. v1.1 work. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callAIWithJSON<T>(options: CallAIOptions): Promise<T> {
  throw new Error("callAIWithJSON not implemented yet — use callAI with prompt-shaped JSON output.");
}

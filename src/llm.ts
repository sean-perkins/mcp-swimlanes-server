import { fetch } from "undici";

export interface LlmOptions {
  provider?: "anthropic" | "openai";
  model?: string;
}

export async function promptToSwimlanesText(
  prompt: string,
  syntaxOverview: string,
  options: LlmOptions = {}
): Promise<string> {
  const provider = options.provider || detectProvider();
  if (!provider) {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
    );
  }

  if (provider === "anthropic") {
    return anthropicPrompt(prompt, syntaxOverview, options.model);
  }
  return openaiPrompt(prompt, syntaxOverview, options.model);
}

function detectProvider(): LlmOptions["provider"] | undefined {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return undefined;
}

function buildSystemPrompt(): string {
  return [
    "You are an expert at writing swimlanes.io diagrams.",
    "Given a user prompt, output ONLY valid swimlanes.io syntax text.",
    "Do not explain. Do not wrap in code fences. Use concise, readable labels.",
    "Prefer the simplest constructs that accurately reflect the prompt.",
  ].join(" ");
}

function buildUserPrompt(userPrompt: string, syntaxOverview: string): string {
  return [
    "Swimlanes.io syntax reference:",
    "---",
    syntaxOverview,
    "---",
    "Task: Convert the following description into a swimlanes.io diagram. Output only the diagram text.",
    `Description: ${userPrompt}`,
  ].join("\n");
}

async function anthropicPrompt(
  prompt: string,
  syntaxOverview: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const chosenModel =
    model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const body = {
    model: chosenModel,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: buildUserPrompt(prompt, syntaxOverview) },
    ],
  } as const;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${text}`);
  }
  const json = (await res.json()) as any;
  const content =
    Array.isArray(json.content) && json.content.length > 0
      ? json.content[0].text
      : undefined;
  if (!content) throw new Error("Anthropic returned no content");
  return content.trim();
}

async function openaiPrompt(
  prompt: string,
  syntaxOverview: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const chosenModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const body = {
    model: chosenModel,
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(prompt, syntaxOverview) },
    ],
  } as const;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${text}`);
  }
  const json = (await res.json()) as any;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return String(content).trim();
}

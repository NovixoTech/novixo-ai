import type { Message, Provider } from "./types.js";

// ─── Default models per provider ─────────────────────────────────────────────

export const DEFAULT_MODELS: Record<Provider, string> = {
  groq:        "llama3-8b-8192",
  gemini:      "gemini-2.0-flash",
  anthropic:   "claude-haiku-4-5-20251001",
  openai:      "gpt-4o-mini",
  cohere:      "command-r-plus",
  mistral:     "mistral-small-latest",
  together:    "meta-llama/Llama-3-8b-chat-hf",
  perplexity:  "llama-3-sonar-small-32k-chat",
  huggingface: "mistralai/Mistral-7B-Instruct-v0.2",
  openrouter:  "openai/gpt-4o-mini",
  fireworks:   "accounts/fireworks/models/llama-v3-8b-instruct",
  deepseek:    "deepseek-chat",
  xai:         "grok-beta",
  ai21:        "jamba-instruct",
  nlpcloud:    "finetuned-llama-3-70b",
};

// ─── Rate limit tracker ───────────────────────────────────────────────────────

const rateLimitedUntil: Partial<Record<Provider, number>> = {};

export function isRateLimited(provider: Provider): boolean {
  const until = rateLimitedUntil[provider];
  if (!until) return false;
  if (Date.now() > until) {
    delete rateLimitedUntil[provider];
    return false;
  }
  return true;
}

function markRateLimited(provider: Provider, retryAfterMs = 60_000): void {
  rateLimitedUntil[provider] = Date.now() + retryAfterMs;
}

function getRetryAfter(headers: Headers, fallback = 60_000): number {
  const val = headers.get("retry-after");
  if (!val) return fallback;
  const secs = parseFloat(val);
  return isNaN(secs) ? fallback : secs * 1000;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Most providers share the OpenAI chat completions format */
async function callOpenAICompat(
  url: string,
  authHeader: Record<string, string>,
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  maxTokens: number,
  temperature: number,
  provider: Provider,
  extraBody: Record<string, unknown> = {}
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
      ...extraBody,
    }),
  });

  if (res.status === 429) {
    markRateLimited(provider, getRetryAfter(res.headers));
    throw Object.assign(new Error(`${provider} rate limited`), { rateLimited: true });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${provider} ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

// ─── Provider implementations ─────────────────────────────────────────────────

export async function callGroq(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "groq"
  );
}

export async function callOpenAI(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "openai"
  );
}

export async function callMistral(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.mistral.ai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "mistral"
  );
}

export async function callTogether(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.together.xyz/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "together"
  );
}

export async function callPerplexity(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.perplexity.ai/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "perplexity"
  );
}

export async function callOpenRouter(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://openrouter.ai/api/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://github.com/NovixoTech/novixo-ai" },
    model, messages, systemPrompt, maxTokens, temperature, "openrouter"
  );
}

export async function callFireworks(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "fireworks"
  );
}

export async function callDeepSeek(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.deepseek.com/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "deepseek"
  );
}

export async function callXAI(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.x.ai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "xai"
  );
}

// ─── Gemini (unique format) ───────────────────────────────────────────────────

export async function callGemini(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    markRateLimited("gemini", getRetryAfter(res.headers));
    throw Object.assign(new Error("Gemini rate limited"), { rateLimited: true });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini ${res.status}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text as string;
}

// ─── Anthropic (unique format) ────────────────────────────────────────────────

export async function callAnthropic(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: messages.filter((m) => m.role !== "system"),
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    markRateLimited("anthropic", getRetryAfter(res.headers));
    throw Object.assign(new Error("Anthropic rate limited"), { rateLimited: true });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

// ─── Cohere (unique format) ───────────────────────────────────────────────────

export async function callCohere(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  // Cohere uses chat_history + message format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "CHATBOT" : "USER",
    message: m.content,
  }));
  const lastMessage = messages[messages.length - 1]?.content ?? "";

  const res = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      message: lastMessage,
      chat_history: history,
      preamble: systemPrompt,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (res.status === 429) {
    markRateLimited("cohere", getRetryAfter(res.headers));
    throw Object.assign(new Error("Cohere rate limited"), { rateLimited: true });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Cohere ${res.status}`);
  }

  const data = await res.json();
  return data.text as string;
}

// ─── Hugging Face Inference API ───────────────────────────────────────────────

export async function callHuggingFace(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  // HF Inference API supports OpenAI-compatible endpoint
  return callOpenAICompat(
    `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "huggingface"
  );
}

// ─── AI21 ─────────────────────────────────────────────────────────────────────

export async function callAI21(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  return callOpenAICompat(
    "https://api.ai21.com/studio/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    model, messages, systemPrompt, maxTokens, temperature, "ai21"
  );
}

// ─── NLP Cloud ────────────────────────────────────────────────────────────────

export async function callNLPCloud(messages: Message[], systemPrompt: string | undefined, apiKey: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  const allMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages,
  ];

  const res = await fetch(`https://api.nlpcloud.io/v1/gpu/${model}/chatbot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      input: allMessages[allMessages.length - 1]?.content ?? "",
      history: allMessages.slice(0, -1).map((m) => ({
        input: m.role === "user" ? m.content : undefined,
        response: m.role === "assistant" ? m.content : undefined,
      })),
      max_length: maxTokens,
      temperature,
    }),
  });

  if (res.status === 429) {
    markRateLimited("nlpcloud", getRetryAfter(res.headers));
    throw Object.assign(new Error("NLPCloud rate limited"), { rateLimited: true });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `NLPCloud ${res.status}`);
  }

  const data = await res.json();
  return data.response as string;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export async function callProvider(
  provider: Provider,
  messages: Message[],
  systemPrompt: string | undefined,
  apiKey: string,
  modelOverride: string | undefined,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const model = modelOverride ?? DEFAULT_MODELS[provider];

  const map: Record<Provider, (...args: Parameters<typeof callGroq>) => Promise<string>> = {
    groq:        callGroq,
    openai:      callOpenAI,
    mistral:     callMistral,
    together:    callTogether,
    perplexity:  callPerplexity,
    openrouter:  callOpenRouter,
    fireworks:   callFireworks,
    deepseek:    callDeepSeek,
    xai:         callXAI,
    gemini:      callGemini,
    anthropic:   callAnthropic,
    cohere:      callCohere,
    huggingface: callHuggingFace,
    ai21:        callAI21,
    nlpcloud:    callNLPCloud,
  };

  const fn = map[provider];
  if (!fn) throw new Error(`Unknown provider: ${provider}`);
  return fn(messages, systemPrompt, apiKey, model, maxTokens, temperature);
                        }

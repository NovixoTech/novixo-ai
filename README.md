# novixo-ai

Unified AI client for Node.js and the browser. One API for **15 AI providers** — with automatic fallback, rate-limit detection, and response caching built in.

```bash
npm install novixo-ai
```

---

## Quick start

```ts
import { NovixoAI } from "novixo-ai";

const ai = new NovixoAI({
  keys: {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  },
});

// Single prompt
const text = await ai.ask("Explain recursion in simple terms");

// Multi-turn chat
const response = await ai.chat([
  { role: "user", content: "What is a binary tree?" },
  { role: "assistant", content: "A binary tree is..." },
  { role: "user", content: "Give me an example in JavaScript" },
]);

console.log(response.text);
console.log(response.provider); // which provider answered
```

---

## Supported providers

| Provider      | Key name      | Default model                              |
|---------------|---------------|--------------------------------------------|
| Groq          | `groq`        | llama-3.3-70b-versatile                    |
| Google Gemini | `gemini`      | gemini-2.0-flash                           |
| Anthropic     | `anthropic`   | claude-haiku-4-5-20251001                  |
| OpenAI        | `openai`      | gpt-4o-mini                                |
| Cohere        | `cohere`      | command-r-plus                             |
| Mistral       | `mistral`     | mistral-small-latest                       |
| Together AI   | `together`    | meta-llama/Llama-3-8b-chat-hf              |
| Perplexity    | `perplexity`  | llama-3-sonar-small-32k-chat               |
| Hugging Face  | `huggingface` | mistralai/Mistral-7B-Instruct-v0.2         |
| OpenRouter    | `openrouter`  | openai/gpt-4o-mini (access to 100+ models) |
| Fireworks AI  | `fireworks`   | llama-v3-8b-instruct                       |
| DeepSeek      | `deepseek`    | deepseek-chat                              |
| xAI (Grok)    | `xai`         | grok-beta                                  |
| AI21          | `ai21`        | jamba-instruct                             |
| NLP Cloud     | `nlpcloud`    | finetuned-llama-3-70b                      |

---

## How fallback works

novixo-ai tries providers **left to right** in your priority order:

1. If a provider is **rate limited**, it's skipped and retried after cooldown.
2. If a provider **fails**, the next one is tried automatically.
3. If **all providers fail**, an error is thrown with details from each attempt.

Default order: `groq → gemini → openai → mistral → anthropic → ...`

---

## Configuration

```ts
const ai = new NovixoAI({
  // Only add keys for providers you have access to
  keys: {
    groq:        "gsk_...",
    gemini:      "AIza...",
    openai:      "sk-...",
    cohere:      "...",
    mistral:     "...",
    together:    "...",
    perplexity:  "pplx-...",
    huggingface: "hf_...",
    openrouter:  "sk-or-...",
    fireworks:   "fw-...",
    deepseek:    "...",
    xai:         "xai-...",
    ai21:        "...",
    nlpcloud:    "...",
    anthropic:   "sk-ant-...",
  },

  // Custom priority order
  providers: ["groq", "gemini", "mistral", "openai"],

  // Override models per provider
  models: {
    openai:  "gpt-4o",
    mistral: "mistral-large-latest",
    groq:    "llama-3.3-70b-versatile",
  },

  maxTokens:   1024,     // default: 1024
  temperature: 0.7,      // default: 0.7
  cache:       true,     // default: true
  cacheTTL:    300_000,  // default: 5 minutes
});
```

---

## API

### `ai.ask(prompt, systemPrompt?)`
Single-turn shorthand. Returns response text as a string.

### `ai.chat(messages, options?)`
Multi-turn chat. Returns an `AIResponse`:

```ts
{
  text:       string   // The model's response
  provider:   string   // Which provider answered
  model:      string   // Which model was used
  cached:     boolean  // Whether this came from cache
  durationMs: number   // Time taken in milliseconds
}
```

### `ai.clearCache()`
Clears the in-memory response cache.

### `ai.cacheSize`
Number of cached entries.

---

## With system prompts

```ts
const res = await ai.chat(
  [{ role: "user", content: "Summarise this for me: ..." }],
  { systemPrompt: "You are a concise academic writing assistant." }
);
```

## Force a specific provider for one call

```ts
const res = await ai.chat(messages, {
  providers: ["openai"], // only use OpenAI for this call
});
```

---

## Part of the NovixoTech ecosystem

- [novixo-engine](https://npmjs.com/package/novixo-engine) — Offline-first network SDK
- [novixo-agent-logger](https://npmjs.com/package/novixo-agent-logger) — AI agent audit trail
- **novixo-ai** — Multi-provider AI client ← you are here

---

## License

MIT © [NovixoTech](https://github.com/NovixoTech)

// ─── Provider Types ───────────────────────────────────────────────────────────

export type Provider =
  | "groq"
  | "gemini"
  | "anthropic"
  | "openai"
  | "cohere"
  | "mistral"
  | "together"
  | "perplexity"
  | "huggingface"
  | "openrouter"
  | "fireworks"
  | "deepseek"
  | "xai"
  | "ai21"
  | "nlpcloud";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NovixoAIConfig {
  /** API keys for each provider */
  keys: Partial<Record<Provider, string>>;

  /**
   * Provider priority order. novixo-ai tries them left to right.
   * Defaults to ["groq", "gemini", "openai", "mistral", "anthropic", ...]
   */
  providers?: Provider[];

  /** Default model per provider. Override if needed. */
  models?: Partial<Record<Provider, string>>;

  /** Max tokens to generate (default: 1024) */
  maxTokens?: number;

  /** Temperature 0–1 (default: 0.7) */
  temperature?: number;

  /** Enable response caching (default: true) */
  cache?: boolean;

  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
}

export interface AIResponse {
  text: string;
  provider: Provider;
  model: string;
  cached: boolean;
  durationMs: number;
}

export interface AIError {
  provider: Provider;
  message: string;
  rateLimited: boolean;
}

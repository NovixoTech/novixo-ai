import { ResponseCache } from "./cache.js";
import { callProvider, isRateLimited, DEFAULT_MODELS } from "./providers.js";
import type { NovixoAIConfig, Message, AIResponse, AIError, Provider } from "./types.js";

const DEFAULT_PROVIDERS: Provider[] = ["groq", "gemini", "anthropic"];

export class NovixoAI {
  private config: Required<NovixoAIConfig>;
  private cache: ResponseCache | null;

  constructor(config: NovixoAIConfig) {
    this.config = {
      keys: config.keys,
      providers: config.providers ?? DEFAULT_PROVIDERS,
      models: config.models ?? {},
      maxTokens: config.maxTokens ?? 1024,
      temperature: config.temperature ?? 0.7,
      cache: config.cache ?? true,
      cacheTTL: config.cacheTTL ?? 5 * 60 * 1000,
    };

    this.cache = this.config.cache ? new ResponseCache(this.config.cacheTTL) : null;
  }

  /**
   * Send a message and get a response.
   * Tries providers in order, skipping rate-limited ones.
   * Falls back automatically on failure.
   *
   * @example
   * const res = await ai.chat([{ role: "user", content: "Explain recursion" }])
   * console.log(res.text)
   */
  async chat(
    messages: Message[],
    options: {
      systemPrompt?: string;
      /** Override provider order for this call only */
      providers?: Provider[];
    } = {}
  ): Promise<AIResponse> {
    const systemPrompt = options.systemPrompt;
    const providers = options.providers ?? this.config.providers;
    const errors: AIError[] = [];

    // Check cache
    if (this.cache) {
      const cached = this.cache.get(messages, systemPrompt);
      if (cached) {
        return {
          text: cached,
          provider: "groq", // placeholder; cached means we don't know original
          model: "cached",
          cached: true,
          durationMs: 0,
        };
      }
    }

    // Try each provider
    for (const provider of providers) {
      const apiKey = this.config.keys[provider];
      if (!apiKey) continue; // no key configured

      if (isRateLimited(provider)) {
        errors.push({ provider, message: "Rate limited, skipping", rateLimited: true });
        continue;
      }

      const start = Date.now();
      try {
        const text = await callProvider(
          provider,
          messages,
          systemPrompt,
          apiKey,
          this.config.models[provider],
          this.config.maxTokens,
          this.config.temperature
        );

        const response: AIResponse = {
          text,
          provider,
          model: this.config.models[provider] ?? DEFAULT_MODELS[provider],
          cached: false,
          durationMs: Date.now() - start,
        };

        // Store in cache
        if (this.cache) {
          this.cache.set(messages, text, systemPrompt);
        }

        return response;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const rateLimited = (err as { rateLimited?: boolean })?.rateLimited === true;
        errors.push({ provider, message, rateLimited });
        console.warn(`[novixo-ai] ${provider} failed: ${message}`);
      }
    }

    // All providers failed
    const summary = errors.map((e) => `${e.provider}: ${e.message}`).join(" | ");
    throw new Error(`All AI providers failed. ${summary}`);
  }

  /**
   * Convenience: single-turn prompt → response string.
   *
   * @example
   * const text = await ai.ask("What is photosynthesis?")
   */
  async ask(prompt: string, systemPrompt?: string): Promise<string> {
    const res = await this.chat(
      [{ role: "user", content: prompt }],
      { systemPrompt }
    );
    return res.text;
  }

  /** Clear the response cache */
  clearCache(): void {
    this.cache?.clear();
  }

  /** How many entries are in the cache */
  get cacheSize(): number {
    return this.cache?.size ?? 0;
  }
      }

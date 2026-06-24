// Simple in-memory LRU-style cache for AI responses

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class ResponseCache {
  private store = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  private key(messages: { role: string; content: string }[], systemPrompt?: string): string {
    return JSON.stringify({ messages, systemPrompt });
  }

  get(messages: { role: string; content: string }[], systemPrompt?: string): string | null {
    const k = this.key(messages, systemPrompt);
    const entry = this.store.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(k);
      return null;
    }
    return entry.value;
  }

  set(messages: { role: string; content: string }[], value: string, systemPrompt?: string): void {
    const k = this.key(messages, systemPrompt);
    this.store.set(k, { value, expiresAt: Date.now() + this.ttl });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

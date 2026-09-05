/**
 * [SLEEP] Cache em memoria, sem Redis. Ele morre quando o servico dorme, e
 * isso e irrelevante: o que vale a pena guardar ja esta em media, com TTL
 * proprio em refreshed_at. Aqui so evitamos repetir a mesma busca em rajada.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500
  ) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    /** Teto de entradas: o container tem 512 MB e nada aqui e essencial. */
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }

    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
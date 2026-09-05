const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Balde de tokens com espacamento minimo, serializado numa fila.
 * A AniList tem dois limites: o de janela (90/min documentado) e um limitador
 * de rajada sem numero publicado. O balde cobre o primeiro, o espacamento
 * cobre o segundo.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();
  private lastCall = 0;
  private pausedUntil = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly capacity: number,
    private readonly minIntervalMs: number
  ) {
    this.tokens = capacity;
  }

  private refill(): void {
    const now = Date.now();
    const gained = ((now - this.lastRefill) / 60_000) * this.capacity;

    if (gained >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + Math.floor(gained));
      this.lastRefill = now;
    }
  }

  /** Chamado ao receber 429: respeita o Retry-After da resposta. */
  pauseFor(seconds: number): void {
    this.pausedUntil = Date.now() + seconds * 1000;
    this.tokens = 0;
  }

  acquire(): Promise<void> {
    const next = this.queue.then(() => this.waitTurn());
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async waitTurn(): Promise<void> {
    const paused = this.pausedUntil - Date.now();
    if (paused > 0) await sleep(paused);

    this.refill();

    while (this.tokens < 1) {
      await sleep(Math.ceil(60_000 / this.capacity));
      this.refill();
    }

    const since = Date.now() - this.lastCall;
    if (since < this.minIntervalMs) await sleep(this.minIntervalMs - since);

    this.tokens -= 1;
    this.lastCall = Date.now();
  }
}
/**
 * Um breaker por fonte, nunca global: AniList fora do ar nao pode impedir
 * busca de filme. Aberto, o detalhe serve o que ja esta em media.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(
    readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 60_000
  ) {}

  /** Fechado, ou aberto ha tempo suficiente para uma tentativa de sondagem. */
  canAttempt(): boolean {
    if (this.openedAt === 0) return true;
    return Date.now() - this.openedAt >= this.cooldownMs;
  }

  get isOpen(): boolean {
    return this.openedAt !== 0 && !this.canAttempt();
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = Date.now();
  }
}
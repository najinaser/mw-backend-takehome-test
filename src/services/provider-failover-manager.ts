export class ProviderFailoverManager {
  private totalAttempts = 0;
  private failedAttempts = 0;

  private usingFallback = false;
  private lastFailoverTime = 0;

  constructor(
    private maxWindowSize: number = 100,
    private failureThreshold: number = 0.5,
    private cooldownMs: number = 5 * 60 * 1000
  ) {}

  logSuccess() {
    this.totalAttempts++;
    this.trim();
  }

  logFailure() {
    this.failedAttempts++;
    this.totalAttempts++;
    this.trim();
  }

  shouldUseFallback(): boolean {
    const now = Date.now();

    if (this.usingFallback && now - this.lastFailoverTime > this.cooldownMs) {
      this.usingFallback = false;
      this.reset();
    }

    if (!this.usingFallback && this.getFailureRate() > this.failureThreshold) {
      this.usingFallback = true;
      this.lastFailoverTime = now;
    }

    return this.usingFallback;
  }

  private getFailureRate(): number {
    if (this.totalAttempts === 0) return 0;
    return this.failedAttempts / this.totalAttempts;
  }

  private trim() {
    // Keep sliding window of size maxWindowSize
    if (this.totalAttempts > this.maxWindowSize) {
      // Reset everything proportionally (optional: track queue of outcomes if needed)
      this.totalAttempts = this.maxWindowSize;
      this.failedAttempts = Math.round(this.failedAttempts * (this.maxWindowSize / this.totalAttempts));
    }
  }

  private reset() {
    this.totalAttempts = 0;
    this.failedAttempts = 0;
  }
}

/**
 * ProviderFailoverManager is responsible for managing the failover logic
 * between different valuation providers based on their success and failure rates.
 * 
 * Provider Failover Logic
 *
 * 1. Try SuperCar by default.
 * 2. If SuperCar fails, fallback to PremiumCar for that request.
 * 3. If SuperCar’s failure rate exceeds 50%, enter failover mode:
 *    - Use PremiumCar as the default provider.
 *    - Stay in failover mode for a configurable cooldown period.
 * 4. After cooldown:
 *    - Reset failure stats.
 *    - Retry using SuperCar as default.
 * 5. If both providers fail for a request:
 *    - Return 503 Service Unavailable.
*/

export class ProviderFailoverManager {
  private outcomes: boolean[] = [];
  private usingFallback = false;
  private failoverStartTime = 0;

  constructor(
    private maxWindowSize: number = 100,
    private failureThreshold: number = 0.5,
    private cooldownMs: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  logSuccess() {
    this.outcomes.push(true);
    this.enforceWindowSize();
  }

  logFailure() {
    this.outcomes.push(false);
    this.enforceWindowSize();
  }

  shouldUseFallback(): boolean {
    const now = Date.now();

    if (this.usingFallback && now - this.failoverStartTime > this.cooldownMs) {
      // Cooldown ended → exit failover mode
      this.usingFallback = false;
      this.outcomes = [];
    }

    const failureRate = this.getFailureRate();

    if (!this.usingFallback && failureRate > this.failureThreshold) {
      // Enter failover mode
      this.usingFallback = true;
      this.failoverStartTime = now;
    }

    return this.usingFallback;
  }

  private getFailureRate(): number {
    if (this.outcomes.length === 0) return 0;

    // Optimisation: If performance critical, try to optimize this by removing the loop?
    const failures = this.outcomes.filter(outcome => !outcome).length;
    return failures / this.outcomes.length;
  }

  private enforceWindowSize() {
    while (this.outcomes.length > this.maxWindowSize) {
      this.outcomes.shift(); // Remove oldest outcome
    }
  }

  /**
   * Resets the failover manager state.
   * Useful for testing or when you want to clear the current state.
   * Currenly only used in tests to reset the failover manager.
   */
  reset() {
    this.outcomes = [];
    this.usingFallback = false;
    this.failoverStartTime = 0;
  }
}
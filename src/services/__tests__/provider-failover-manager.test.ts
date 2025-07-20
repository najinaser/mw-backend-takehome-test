import { describe, it, expect, vi } from 'vitest';
import { ProviderFailoverManager } from '../provider-failover-manager';

vi.useFakeTimers();

describe('ProviderFailoverManager', () => {

  it('should not use fallback when start', () => {
    const mgr = new ProviderFailoverManager();

    expect(mgr.shouldUseFallback()).toBe(false);
  });

  it('should not use fallback if failure rate is low', () => {
    const mgr = new ProviderFailoverManager();

    for (let i = 0; i < 9; i++) mgr.logSuccess();
    mgr.logFailure();

    expect(mgr.shouldUseFallback()).toBe(false);
  });

  it('should switch to fallback if failure rate is over 50%', () => {
    const mgr = new ProviderFailoverManager();

    for (let i = 0; i < 4; i++) mgr.logSuccess();
    for (let i = 0; i < 6; i++) mgr.logFailure();

    expect(mgr.shouldUseFallback()).toBe(true);
  });

  it('should stay in fallback until cooldown expires', () => {
    const mgr = new ProviderFailoverManager(100, 0.5, 10000);

    for (let i = 0; i < 6; i++) mgr.logFailure();
    for (let i = 0; i < 4; i++) mgr.logSuccess();
    expect(mgr.shouldUseFallback()).toBe(true);

    vi.setSystemTime(Date.now() + 5000);
    expect(mgr.shouldUseFallback()).toBe(true);
  });

  it('should return to main provider after cooldown and reset counters', () => {
    const mgr = new ProviderFailoverManager(100, 0.5, 10000);

    for (let i = 0; i < 6; i++) mgr.logFailure();
    for (let i = 0; i < 4; i++) mgr.logSuccess();
    expect(mgr.shouldUseFallback()).toBe(true);

    vi.setSystemTime(Date.now() + 15000);
    expect(mgr.shouldUseFallback()).toBe(false);
  });
});
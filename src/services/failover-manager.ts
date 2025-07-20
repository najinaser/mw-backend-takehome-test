import { ProviderFailoverManager } from './provider-failover-manager';

// Singilton instance of ProviderFailoverManager
export const failoverManager = new ProviderFailoverManager(
  100,
  0.5,
  5 * 60 * 1000
);
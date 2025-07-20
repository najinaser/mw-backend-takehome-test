import { describe, it, vi, expect, beforeEach } from 'vitest';
import { createValuation } from '../create-valuation';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { ProviderLogs } from '@app/models/provider-logs';
import { FastifyBaseLogger } from 'fastify';
import { Repository } from 'typeorm';
import { failoverManager } from '../failover-manager';

vi.mock('@app/valuation-providers', () => ({
  fetchValuationFromSuperCarValuation: vi.fn(),
  fetchValuationFromPremiumCarValuation: vi.fn()
}));

import {
  fetchValuationFromSuperCarValuation,
  fetchValuationFromPremiumCarValuation
} from '@app/valuation-providers';

describe('createValuation', () => {
  const fakeValuation: VehicleValuation = {
    vrm: 'ABC123',
    lowestValue: 5000,
    highestValue: 8000,
    providerName: 'SuperCar',
    midpointValue: 0
  };

  let valuationRepo: Partial<Repository<VehicleValuation>>;
  let providerLogsRepo: Partial<Repository<ProviderLogs>>;
  let logger: FastifyBaseLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    failoverManager.reset();

    valuationRepo = {
      findOneBy: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(undefined),
    };

    providerLogsRepo = {
      create: vi.fn((log) => log),
      save: vi.fn().mockResolvedValue(undefined),
    };

    logger = {
      info: vi.fn(),
      child: () => logger,
    } as unknown as FastifyBaseLogger;
  });

  it('returns existing valuation if already in DB', async () => {
    (valuationRepo.findOneBy as any).mockResolvedValue(fakeValuation);

    const result = await createValuation(
      {
        valuationRepository: valuationRepo as any,
        providerLogsRepository: providerLogsRepo as any,
        logger,
      },
      'ABC123',
      10000
    );

    expect(result).toBe(fakeValuation);
    expect(fetchValuationFromSuperCarValuation).not.toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).not.toHaveBeenCalled();
  });

  it('calls SuperCar and saves the valuation on success', async () => {
    (fetchValuationFromSuperCarValuation as any).mockResolvedValue(fakeValuation);

    const result = await createValuation(
      {
        valuationRepository: valuationRepo as any,
        providerLogsRepository: providerLogsRepo as any,
        logger,
      },
      'ABC1234',
      10000
    );

    expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).not.toHaveBeenCalled();
    expect(valuationRepo.insert).toHaveBeenCalledWith(fakeValuation);
    expect(logger.info).toHaveBeenCalled();
    expect(result.providerName).toBe('SuperCar');
  });

  it('uses PremiumCar if SuperCar fails', async () => {
    const fallbackValuation = { ...fakeValuation, providerName: 'PremiumCar' };

    (fetchValuationFromSuperCarValuation as any).mockRejectedValue(new Error('fail'));
    (fetchValuationFromPremiumCarValuation as any).mockResolvedValue(fallbackValuation);

    const result = await createValuation(
      {
        valuationRepository: valuationRepo as any,
        providerLogsRepository: providerLogsRepo as any,
        logger,
      },
      'XYZ999',
      10000
    );

    expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).toHaveBeenCalled();
    expect(result.providerName).toBe('PremiumCar');
  });

  it('uses PremiumCar by default after SuperCar fails enough times (failover mode)', async () => {
    // Simulate repeated failures to exceed 50% threshold
    for (let i = 0; i < 60; i++) failoverManager.logFailure();
    for (let i = 0; i < 40; i++) failoverManager.logSuccess();

    const fallbackValuation = { ...fakeValuation, providerName: 'PremiumCar' };
    (fetchValuationFromPremiumCarValuation as any).mockResolvedValue(fallbackValuation);

    const result = await createValuation(
      {
        valuationRepository: valuationRepo as any,
        providerLogsRepository: providerLogsRepo as any,
        logger,
      },
      'FAILOVER123',
      10000
    );

    expect(fetchValuationFromSuperCarValuation).not.toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).toHaveBeenCalled();
    expect(result.providerName).toBe('PremiumCar');
  });

  it('throws if both providers fail', async () => {
    (fetchValuationFromSuperCarValuation as any).mockRejectedValue(new Error('fail 1'));
    (fetchValuationFromPremiumCarValuation as any).mockRejectedValue(new Error('fail 2'));

    await expect(() =>
      createValuation(
        {
          valuationRepository: valuationRepo as any,
          providerLogsRepository: providerLogsRepo as any,
          logger,
        },
        'FAIL999',
        10000
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Service Unavailable: Unable to fetch valuation from both providers'
    });
  });
});
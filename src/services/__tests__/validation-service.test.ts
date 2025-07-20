import { describe, it, vi, expect, beforeEach } from 'vitest';
import { createValuation } from '../valuation-service';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { FastifyBaseLogger } from 'fastify';

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
    // providerName: 'SuperCar',
    midpointValue: 0 // unused
  };

  const logger: FastifyBaseLogger = {
    info: vi.fn(),
    child: () => logger
  } as unknown as FastifyBaseLogger;

  let repo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    repo = {
      findOneBy: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('returns existing valuation if already in DB', async () => {
    repo.findOneBy.mockResolvedValue(fakeValuation);

    const result = await createValuation(repo, logger, 'ABC123', 10000);

    expect(result).toBe(fakeValuation);
    expect(fetchValuationFromSuperCarValuation).not.toHaveBeenCalled();
  });

  it('calls SuperCar and saves the valuation on success', async () => {
    (fetchValuationFromSuperCarValuation as any).mockResolvedValue(fakeValuation);

    const result = await createValuation(repo, logger, 'ABC123', 10000);

    expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).not.toHaveBeenCalled();
    expect(repo.insert).toHaveBeenCalledWith(fakeValuation);
    expect(logger.info).toHaveBeenCalled();
    expect(result).toBe(fakeValuation);
  });

  it('uses PremiumCar if SuperCar fails', async () => {
    const fallbackValuation = { ...fakeValuation, providerName: 'PremiumCar' };

    (fetchValuationFromSuperCarValuation as any).mockRejectedValue(new Error('fail'));
    (fetchValuationFromPremiumCarValuation as any).mockResolvedValue(fallbackValuation);

    const result = await createValuation(repo, logger, 'XYZ999', 10000);

    expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
    expect(fetchValuationFromPremiumCarValuation).toHaveBeenCalled();
    // expect(result.providerName).toBe('PremiumCar');
  });

  it('throws if both providers fail', async () => {
    (fetchValuationFromSuperCarValuation as any).mockRejectedValue(new Error('fail 1'));
    (fetchValuationFromPremiumCarValuation as any).mockRejectedValue(new Error('fail 2'));

    await expect(createValuation(repo, logger, 'FAIL999', 10000)).rejects.toThrow('fail 2');
  });

//   it('ignores SQLITE_CONSTRAINT errors on insert', async () => {
//     repo.insert.mockRejectedValue({ code: 'SQLITE_CONSTRAINT' });
//     (fetchValuationFromSuperCarValuation as any).mockResolvedValue(fakeValuation);

//     const result = await createValuation(repo, logger, 'ABC123', 10000);

//     expect(result).toBe(fakeValuation);
//     expect(logger.info).toHaveBeenCalled();
//   });
});
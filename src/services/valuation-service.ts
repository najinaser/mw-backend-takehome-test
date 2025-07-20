import { Repository } from 'typeorm';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { fetchValuationFromPremiumCarValuation, fetchValuationFromSuperCarValuation } from '@app/valuation-providers';
import { failoverManager } from './failover-manager';
import { FastifyBaseLogger } from "fastify";

export async function createValuation(valuationRepository: Repository<VehicleValuation>, logger: FastifyBaseLogger, vrm: string, mileage: number): Promise<VehicleValuation> {

    // If already exists, return it
    const existing = await valuationRepository.findOneBy({ vrm });
    if (existing) return existing;

    let valuation: VehicleValuation;

    const useFallback = failoverManager.shouldUseFallback();

    try {
        valuation = useFallback
        ? await fetchValuationFromPremiumCarValuation(vrm)
        : await fetchValuationFromSuperCarValuation(vrm, mileage);

        failoverManager.logSuccess();
    } catch (err) {
        failoverManager.logFailure();

        if (!useFallback) {
            // Try Premium as fallback
            try {
                valuation = await fetchValuationFromPremiumCarValuation(vrm);
                failoverManager.logSuccess();
            } catch (finalErr) {
                failoverManager.logFailure();
                throw finalErr;
            }
        } else {
            throw err;
        }
    }

    await valuationRepository.insert(valuation).catch((err) => {
        if (err.code !== 'SQLITE_CONSTRAINT') {
        throw err;
        }
    });

    logger.info('Valuation created: ', valuation);

    return valuation;
}
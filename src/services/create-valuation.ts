import { VehicleValuation } from '@app/models/vehicle-valuation';
import { fetchValuationFromPremiumCarValuation, fetchValuationFromSuperCarValuation } from '@app/valuation-providers';
import { failoverManager } from './failover-manager';
import { CreateValuationDeps } from "./types/create-aluation-deps";

export async function createValuation(createValuationDeps: CreateValuationDeps, vrm: string, mileage: number): Promise<VehicleValuation> {

    // If already exists, return it
    const existing = await createValuationDeps.valuationRepository.findOneBy({ vrm });
    if (existing) {
        return existing
    };

    let valuation: VehicleValuation;

    // Provider Failover Logic:
    // 1. Use SuperCar by default.
    // 2. Fallback to PremiumCar if SuperCar fails.
    // 3. If SuperCar's failure rate > 50%, switch to PremiumCar (failover mode).
    //    - Failover lasts for a cooldown period.
    // 4. After cooldown, reset and retry SuperCar.
    // 5. If both fail, return 503 Service Unavailable.
    const useFallback = failoverManager.shouldUseFallback();

    try {
        if (useFallback) {
            valuation = await fetchValuationFromPremiumCarValuation(createValuationDeps.providerLogsRepository, vrm)
        } else {
            valuation = await fetchValuationFromSuperCarValuation(createValuationDeps.providerLogsRepository, vrm, mileage);
            // Only log success if SuperCar succeeds
            failoverManager.logSuccess(); 
        }
    } catch (err) {
        if (!useFallback) {
            // Log failure for SuperCar
            failoverManager.logFailure();

            // Try Premium as fallback
            try {
                valuation = await fetchValuationFromPremiumCarValuation(createValuationDeps.providerLogsRepository, vrm);
            } catch (finalErr) {
                // 503 Service Unavailable if both fail
                throw {
                    statusCode: 503,
                    message: 'Service Unavailable: Unable to fetch valuation from both providers'
                };
            }
        } else {
            // We’re in failover mode — PremiumCar failed, no retry
            throw err;
        }         
    }

    await createValuationDeps.valuationRepository.insert(valuation).catch((err) => {
        if (err.code !== 'SQLITE_CONSTRAINT') {
        throw err;
        }
    });

    createValuationDeps.logger.info('Valuation created: ', valuation);

    return valuation;
}
import { Repository } from 'typeorm';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { ProviderLogs } from '@app/models/provider-logs';
import { fetchValuationFromPremiumCarValuation, fetchValuationFromSuperCarValuation } from '@app/valuation-providers';
import { failoverManager } from './failover-manager';
import { FastifyBaseLogger } from "fastify";

interface CreateValuationDeps {
  valuationRepository: Repository<VehicleValuation>;
  providerLogsRepository: Repository<ProviderLogs>;
  logger: FastifyBaseLogger;
}


export async function createValuation(createValuationDeps: CreateValuationDeps, vrm: string, mileage: number): Promise<VehicleValuation> {

    // If already exists, return it
    const existing = await createValuationDeps.valuationRepository.findOneBy({ vrm });
    if (existing) {
        return existing
    };

    let valuation: VehicleValuation;

    const useFallback = failoverManager.shouldUseFallback();

    try {
        valuation = useFallback
        ? await fetchValuationFromPremiumCarValuation(createValuationDeps.providerLogsRepository, vrm)
        : await fetchValuationFromSuperCarValuation(createValuationDeps.providerLogsRepository, vrm, mileage);

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
                // 503 Service Unavailable if both fail
                throw {
                    statusCode: 503,
                    message: 'Service Unavailable: Unable to fetch valuation from both providers'
                };
            }
        } else {
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
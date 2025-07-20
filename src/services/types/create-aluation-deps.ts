import { Repository } from 'typeorm';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { ProviderLogs } from '@app/models/provider-logs';
import { FastifyBaseLogger } from "fastify";

export type CreateValuationDeps  = {
  valuationRepository: Repository<VehicleValuation>;
  providerLogsRepository: Repository<ProviderLogs>;
  logger: FastifyBaseLogger;
}
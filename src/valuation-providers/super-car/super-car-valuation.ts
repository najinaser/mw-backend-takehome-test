import axios from 'axios';
import { VehicleValuation } from '../../models/vehicle-valuation';
import { SuperCarValuationResponse } from './types/super-car-valuation-response';
import { Repository } from 'typeorm';
import { ProviderLogs } from '@app/models/provider-logs';

const PROVIDER_NAME = 'SuperCar';

export async function fetchValuationFromSuperCarValuation(
  providerLogsRepository: Repository<ProviderLogs>,
  vrm: string,
  mileage: number,
): Promise<VehicleValuation> {
  const baseURL = 'https://run.mocky.io/v3/9245229e-5c57-44e1-964b-36c7fb29168b';
  const requestUrl = `valuations/${vrm}?mileage=${mileage}`;
  const start = Date.now();
  const requestDateTime = new Date();

  let responseCode = 200;
  let errorMessage: string | undefined;

  try {
    axios.defaults.baseURL = baseURL;

    const response = await axios.get<SuperCarValuationResponse>(requestUrl);

    const valuation = new VehicleValuation();
    valuation.vrm = vrm;
    valuation.lowestValue = response.data.valuation.lowerValue;
    valuation.highestValue = response.data.valuation.upperValue;
    valuation.providerName = PROVIDER_NAME;

    return valuation;
  } catch (error: any) {
    responseCode = error?.response?.status ?? 500;
    errorMessage = error?.message ?? 'Unknown error';
    throw error;
  } finally {
    const duration = Date.now() - start;

    const log = providerLogsRepository.create({
      vrm,
      providerName: PROVIDER_NAME,
      requestDateTime,
      requestDurationMs: duration,
      requestUrl,
      responseCode,
      errorMessage,
    });

    await providerLogsRepository.save(log);
  }
}
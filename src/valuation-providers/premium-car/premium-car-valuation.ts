import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { PremiumCarValuationXmlResponse } from './types/premium-car-aluation-response';
import { Repository } from 'typeorm';
import { ProviderLogs } from '@app/models/provider-logs';

const PROVIDER_NAME = 'PremiumCar';

export async function fetchValuationFromPremiumCarValuation(
  providerLogsRepository: Repository<ProviderLogs>,
  vrm: string
): Promise<VehicleValuation> {

  const baseURL = 'https://run.mocky.io/v3/0dfda26a-3a5a-43e5-b68c-51f148eda473';
  const path = '/valueCar';
  const fullUrl = `${baseURL}${path}?${new URLSearchParams({ vrm }).toString()}`;

  const premiumCarClient = axios.create({
    baseURL,
    headers: {
      Accept: 'application/xml',
    },
  });

  const start = Date.now();
  const requestDateTime = new Date();

  let responseCode = 200;
  let errorMessage: string | undefined;

  try {
    const response = await premiumCarClient.get(path, {
      params: { vrm },
      responseType: 'text',
    });

    const parser = new XMLParser();
    const result = parser.parse(response.data) as PremiumCarValuationXmlResponse;
    const root = result.root;

    const valuation = new VehicleValuation();
    valuation.vrm = vrm;
    valuation.lowestValue = root.ValuationPrivateSaleMinimum ?? root.ValuationDealershipMinimum;
    valuation.highestValue = root.ValuationPrivateSaleMaximum ?? root.ValuationDealershipMaximum;
    valuation.providerName = PROVIDER_NAME;

    return valuation;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      responseCode = error.response?.status ?? 500;
      errorMessage = error.message;
    } else {
      responseCode = 500;
      errorMessage = 'Unknown error';
    }
    throw error;
  } finally {
    const duration = Date.now() - start;

    const log = providerLogsRepository.create({
      vrm,
      providerName: PROVIDER_NAME,
      requestDateTime,
      requestDurationMs: duration,
      requestUrl: fullUrl,
      responseCode,
      errorMessage,
    });

    await providerLogsRepository.save(log);
  }
}
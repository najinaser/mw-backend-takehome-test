import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { PremiumCarValuationXmlResponse } from "./types/premium-car-aluation-response";

const PROVIDER_NAME = 'PremiumCar';

export async function fetchValuationFromPremiumCarValuation(vrm: string): Promise<VehicleValuation> {
    const premiumCarClient = axios.create({
        baseURL: 'https://run.mocky.io/v3/0dfda26a-3a5a-43e5-b68c-51f148eda473',
        headers: {
            Accept: 'application/xml',
        }
    });
  const response = await premiumCarClient.get('', {
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
}
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { fetchValuationFromPremiumCarValuation } from '../premium-car-valuation';
import { VehicleValuation } from '@app/models/vehicle-valuation';

vi.mock('axios');

interface AxiosMock {
  create: () => {
    get: (url: string, config?: object) => Promise<{ data: string }>;
  };
}

const mockedAxios = axios as unknown as AxiosMock;

describe('fetchValuationFromPremiumCarValuation', () => {
  const mockXmlResponse = `
    <?xml version="1.0" encoding="UTF-8" ?>
<root>
  <RegistrationDate>2012-06-14T00:00:00.0000000</RegistrationDate>
  <RegistrationYear>2001</RegistrationYear>
  <RegistrationMonth>10</RegistrationMonth>
  <ValuationPrivateSaleMinimum>11500</ValuationPrivateSaleMinimum>
  <ValuationPrivateSaleMaximum>12750</ValuationPrivateSaleMaximum>
  <ValuationDealershipMinimum>9500</ValuationDealershipMinimum>
  <ValuationDealershipMaximum>10275</ValuationDealershipMaximum>
</root>`;

  it('parses and returns a VehicleValuation using private sale values', async () => {
    const getMock = vi.fn().mockResolvedValue({ data: mockXmlResponse });
    mockedAxios.create = vi.fn().mockReturnValue({ get: getMock });

    const result = await fetchValuationFromPremiumCarValuation('AA69BCD');

    expect(getMock).toHaveBeenCalledWith('', {
      params: { vrm: 'AA69BCD' },
      responseType: 'text',
    });

    expect(result).toBeInstanceOf(VehicleValuation);
    expect(result.vrm).toBe('AA69BCD');
    expect(result.lowestValue).toBe(11500);
    expect(result.highestValue).toBe(12750);
  });
});
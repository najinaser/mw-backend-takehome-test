import { vi } from 'vitest';
vi.mock('@app/valuation-providers/super-car/super-car-valuation', () => ({
  fetchValuationFromSuperCarValuation: vi.fn(() => ({
    vrm: 'ABC123',
    lowestValue: 5000,
    highestValue: 8000,
  })),
}));

import { fastify } from '~root/test/fastify';
import { VehicleValuationRequest } from '../types/vehicle-valuation-request';
import { VehicleValuation } from '@app/models/vehicle-valuation';

describe('ValuationController (e2e)', () => {

  beforeEach(async () => {
    const repo = fastify.orm.getRepository(VehicleValuation);
    await repo.clear();
  });

  describe('GET /valuations/', () => {
    it("shoudl return 400 if VRM is more than 7 characters", async () => {
      const res = await fastify.inject({
        url: '/valuations/12345678',
        method: 'GET',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({
        message: 'vrm must be 7 characters or less',
        statusCode: 400,
      });
    })
    it('should return 404 if valuation not found', async () => {
      const res = await fastify.inject({
        url: '/valuations/NOEXIST',
        method: 'GET',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        message: 'Valuation for VRM NOEXIST not found',
        statusCode: 404,
      });
    });

    it('should return 200 with existing valuation', async () => {
      const repo = fastify.orm.getRepository(VehicleValuation);

        const valuation = new VehicleValuation();
        valuation.vrm = "ABC123";
        valuation.lowestValue = 5000
        valuation.highestValue = 8000;

        await repo.insert(valuation);

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        vrm: 'ABC123',
        lowestValue: 5000,
        providerName: null,
        highestValue: 8000,
      });
    });
  });
  describe('PUT /valuations/', () => {
    it('should return 404 if VRM is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations',
        method: 'PUT',
        body: requestBody,
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return 400 if VRM is 8 characters or more', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations/12345678',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        // @ts-expect-error intentionally malformed payload
        mileage: null,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is negative', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: -1,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 200 with valid request', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(200);
    });
  });
});

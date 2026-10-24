const { calculateDistance, estimateDuration } = require('../src/utils/haversine');
const { getSurgeMultiplier } = require('../src/utils/surgeCalculator');
const fareService = require('../src/services/fareService');

describe('Fare Calculation & Geo Math Utilities', () => {
  describe('Haversine Formula', () => {
    it('should return 0 km when origin and destination are identical', () => {
      const distance = calculateDistance(19.076, 72.8777, 19.076, 72.8777);
      expect(distance).toBe(0);
    });

    it('should calculate accurate distance between two known geographic points', () => {
      // Bandra (19.0544, 72.8402) to Airport (19.0886, 72.8679) is approx 4.8 - 5.2 km
      const distance = calculateDistance(19.0544, 72.8402, 19.0886, 72.8679);
      expect(distance).toBeGreaterThan(3.5);
      expect(distance).toBeLessThan(7.0);
    });

    it('should estimate realistic urban driving duration based on speed', () => {
      const duration = estimateDuration(10, 30); // 10 km at 30 km/h = 20 mins
      expect(duration).toBe(20);
    });
  });

  describe('Surge Pricing Logic', () => {
    it('should return 1.0x surge during non-peak standard hours', () => {
      const regularTime = new Date('2026-10-21T14:00:00'); // 2:00 PM Wednesday
      const surge = getSurgeMultiplier({ currentTime: regularTime, pendingRequests: 1, availableDrivers: 3 });
      expect(surge.surgeMultiplier).toBe(1.0);
      expect(surge.isSurgeActive).toBe(false);
    });

    it('should apply surge multiplier during morning peak rush hour (8:00 AM - 11:00 AM)', () => {
      const morningRush = new Date('2026-10-21T09:30:00'); // 9:30 AM
      const surge = getSurgeMultiplier({ currentTime: morningRush, pendingRequests: 1, availableDrivers: 2 });
      expect(surge.surgeMultiplier).toBeGreaterThanOrEqual(1.4);
      expect(surge.isSurgeActive).toBe(true);
    });

    it('should apply surge multiplier during high demand vs low supply', () => {
      const regularTime = new Date('2026-10-21T14:00:00');
      // 10 pending requests with only 2 available drivers
      const surge = getSurgeMultiplier({ currentTime: regularTime, pendingRequests: 10, availableDrivers: 2 });
      expect(surge.surgeMultiplier).toBeGreaterThan(1.0);
    });
  });

  describe('Fare Breakdown Service', () => {
    it('should calculate accurate transparent pricing for economy ride', () => {
      const estimate = fareService.calculateFare({
        distanceKm: 5,
        durationMinutes: 15,
        rideType: 'economy',
        pendingRequests: 0,
        availableDrivers: 5
      });

      expect(estimate).toHaveProperty('totalFare');
      expect(estimate).toHaveProperty('driverEarnings');
      expect(estimate).toHaveProperty('platformFee');
      expect(estimate.breakdown.distanceKm || estimate.distanceKm).toBe(5);
      expect(estimate.totalFare).toBeGreaterThan(60); // minimum fare
    });

    it('should apply vehicle multipliers properly for comfort and xl tiers', () => {
      const economy = fareService.calculateFare({ distanceKm: 8, durationMinutes: 20, rideType: 'economy' });
      const comfort = fareService.calculateFare({ distanceKm: 8, durationMinutes: 20, rideType: 'comfort' });
      const xl = fareService.calculateFare({ distanceKm: 8, durationMinutes: 20, rideType: 'xl' });

      expect(comfort.totalFare).toBeGreaterThan(economy.totalFare);
      expect(xl.totalFare).toBeGreaterThan(comfort.totalFare);
    });
  });
});

const config = require('../config/config');
const { getSurgeMultiplier } = require('../utils/surgeCalculator');

/**
 * Service to calculate transparent ride fare breakdowns and surge pricing.
 */
class FareService {
  /**
   * Vehicle type multiplier map
   */
  getVehicleTypeMultiplier(rideType = 'economy') {
    const multipliers = {
      economy: 1.0,
      comfort: 1.25,
      xl: 1.55
    };
    return multipliers[rideType.toLowerCase()] || 1.0;
  }

  /**
   * Calculate detailed fare estimation.
   *
   * @param {Object} params
   * @param {number} params.distanceKm
   * @param {number} params.durationMinutes
   * @param {string} [params.rideType='economy']
   * @param {number} [params.pendingRequests=0]
   * @param {number} [params.availableDrivers=1]
   * @returns {Object} Comprehensive fare breakdown
   */
  calculateFare({
    distanceKm,
    durationMinutes,
    rideType = 'economy',
    pendingRequests = 0,
    availableDrivers = 1
  }) {
    const baseFareConfig = config.fare.baseFare;
    const perKmRate = config.fare.perKmRate;
    const perMinuteRate = config.fare.perMinuteRate;
    const minFareConfig = config.fare.minimumFare;

    const vehicleMultiplier = this.getVehicleTypeMultiplier(rideType);
    const surgeData = getSurgeMultiplier({
      pendingRequests,
      availableDrivers
    });

    const surgeMultiplier = surgeData.surgeMultiplier;

    // Base calculations
    const baseFare = baseFareConfig * vehicleMultiplier;
    const distanceCost = distanceKm * perKmRate * vehicleMultiplier;
    const timeCost = durationMinutes * perMinuteRate;

    // Subtotal before surge
    const standardSubtotal = baseFare + distanceCost + timeCost;

    // Apply surge multiplier
    const surgeAmount = standardSubtotal * (surgeMultiplier - 1.0);
    const totalBeforeTax = standardSubtotal * surgeMultiplier;

    // Enforce minimum fare
    const effectiveTotalBeforeTax = Math.max(totalBeforeTax, minFareConfig * vehicleMultiplier);

    // 5% Platform Tax / GST
    const taxRate = 0.05;
    const taxAmount = Math.round(effectiveTotalBeforeTax * taxRate * 100) / 100;
    const finalFare = Math.round((effectiveTotalBeforeTax + taxAmount) * 100) / 100;

    // Driver split: 80% to driver, 20% platform fee
    const driverEarnings = Math.round(effectiveTotalBeforeTax * 0.80 * 100) / 100;
    const platformFee = Math.round((effectiveTotalBeforeTax * 0.20 + taxAmount) * 100) / 100;

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round(durationMinutes),
      rideType,
      breakdown: {
        baseFare: Math.round(baseFare * 100) / 100,
        perKmRate: Math.round(perKmRate * vehicleMultiplier * 100) / 100,
        distanceFare: Math.round(distanceCost * 100) / 100,
        perMinuteRate,
        timeFare: Math.round(timeCost * 100) / 100,
        vehicleMultiplier,
        surgeMultiplier,
        surgeAmount: Math.round(surgeAmount * 100) / 100,
        taxAmount,
        subtotal: Math.round(effectiveTotalBeforeTax * 100) / 100
      },
      totalFare: finalFare,
      driverEarnings,
      platformFee,
      isSurgeActive: surgeData.isSurgeActive,
      surgeReason: surgeData.reasons,
      currency: 'INR'
    };
  }
}

module.exports = new FareService();

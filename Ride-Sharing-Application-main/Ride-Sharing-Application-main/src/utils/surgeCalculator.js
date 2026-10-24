const config = require('../config/config');

/**
 * Determine dynamic surge multiplier based on current time and demand-supply ratio.
 *
 * @param {Object} options
 * @param {Date} [options.currentTime=new Date()]
 * @param {number} [options.pendingRequests=0]
 * @param {number} [options.availableDrivers=1]
 * @returns {Object} { surgeMultiplier, reason }
 */
function getSurgeMultiplier({ currentTime = new Date(), pendingRequests = 0, availableDrivers = 1 } = {}) {
  let multiplier = 1.0;
  const reasons = [];

  const hour = currentTime.getHours();
  const day = currentTime.getDay(); // 0 is Sunday, 6 is Saturday

  // 1. Time-of-day peak hours check
  // Morning Rush: 8:00 AM - 10:30 AM
  if (hour >= 8 && hour < 11) {
    multiplier = Math.max(multiplier, config.fare.surgePeakMultiplier || 1.4);
    reasons.push('Morning peak rush hour');
  }

  // Evening Rush: 5:00 PM - 8:30 PM
  if (hour >= 17 && hour < 21) {
    multiplier = Math.max(multiplier, (config.fare.surgePeakMultiplier || 1.4) + 0.1);
    reasons.push('Evening peak rush hour');
  }

  // Late weekend night: Fri/Sat 10:00 PM - 2:00 AM
  if ((day === 5 || day === 6) && (hour >= 22 || hour < 2)) {
    multiplier = Math.max(multiplier, 1.3);
    reasons.push('Weekend late-night high activity');
  }

  // 2. High Demand vs Available Drivers ratio
  if (availableDrivers > 0 && pendingRequests > availableDrivers) {
    const demandRatio = pendingRequests / availableDrivers;
    if (demandRatio > 1.5) {
      const additionalSurge = Math.min((demandRatio - 1) * 0.2, 0.8);
      multiplier = Math.max(multiplier, 1.0 + additionalSurge);
      reasons.push(`High rider demand (${pendingRequests} requests for ${availableDrivers} drivers)`);
    }
  } else if (availableDrivers === 0 && pendingRequests > 0) {
    multiplier = Math.max(multiplier, config.fare.surgeHighDemandMultiplier || 1.75);
    reasons.push('Extremely low driver availability in this area');
  }

  // Cap surge pricing between 1.0x and 2.5x
  const finalMultiplier = Math.min(Math.max(Math.round(multiplier * 100) / 100, 1.0), 2.5);

  return {
    surgeMultiplier: finalMultiplier,
    isSurgeActive: finalMultiplier > 1.0,
    reasons: reasons.length > 0 ? reasons.join('; ') : 'Standard pricing'
  };
}

module.exports = {
  getSurgeMultiplier
};

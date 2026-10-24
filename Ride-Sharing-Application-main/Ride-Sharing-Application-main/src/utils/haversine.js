/**
 * Calculate Great-Circle distance between two coordinates in kilometers using Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371; // Earth radius in KM

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusKm * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Estimate travel time in minutes based on distance and average urban vehicle speed.
 * Average city speed is considered ~30 km/h with a minimum travel time threshold.
 *
 * @param {number} distanceKm
 * @param {number} [avgSpeedKmH=30]
 * @returns {number} Estimated duration in minutes
 */
function estimateDuration(distanceKm, avgSpeedKmH = 30) {
  if (distanceKm <= 0) return 2; // minimum 2 min for instant boarding
  const hours = distanceKm / avgSpeedKmH;
  const minutes = Math.round(hours * 60);
  return Math.max(minutes, 3);
}

module.exports = {
  calculateDistance,
  estimateDuration
};

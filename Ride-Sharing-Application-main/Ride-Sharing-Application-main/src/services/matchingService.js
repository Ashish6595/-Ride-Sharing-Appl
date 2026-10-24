const { Op } = require('sequelize');
const { DriverProfile, User } = require('../models');
const { calculateDistance, estimateDuration } = require('../utils/haversine');
const config = require('../config/config');

/**
 * Service to match ride requests with nearby active drivers.
 */
class MatchingService {
  /**
   * Find nearest available drivers to a given pickup coordinate.
   *
   * @param {Object} params
   * @param {number} params.pickupLat
   * @param {number} params.pickupLng
   * @param {string} [params.rideType='economy']
   * @param {number} [params.radiusKm]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array>} List of sorted matched drivers with distance & ETA
   */
  async findNearestDrivers({
    pickupLat,
    pickupLng,
    rideType = 'economy',
    radiusKm = config.matching.defaultRadiusKm,
    limit = 10
  }) {
    // Query drivers who are online/available and have valid coordinates
    const whereClause = {
      isAvailable: true,
      currentLatitude: { [Op.ne]: null },
      currentLongitude: { [Op.ne]: null }
    };

    if (rideType) {
      whereClause.vehicleType = rideType;
    }

    const drivers = await DriverProfile.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'avatarUrl', 'isActive'],
          where: { isActive: true }
        }
      ]
    });

    const candidates = [];

    for (const driver of drivers) {
      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        driver.currentLatitude,
        driver.currentLongitude
      );

      // Check if driver is within the search radius
      if (distance <= radiusKm) {
        const etaMinutes = estimateDuration(distance, 35);

        candidates.push({
          driverId: driver.userId,
          driverProfileId: driver.id,
          name: driver.user.name,
          phone: driver.user.phone,
          avatarUrl: driver.user.avatarUrl,
          vehicleModel: driver.vehicleModel,
          vehiclePlate: driver.vehiclePlate,
          vehicleColor: driver.vehicleColor,
          vehicleType: driver.vehicleType,
          rating: driver.averageRating,
          totalRides: driver.totalRides,
          distanceKm: distance,
          etaMinutes,
          coordinates: {
            lat: driver.currentLatitude,
            lng: driver.currentLongitude
          }
        });
      }
    }

    // Sort by shortest distance first, then by higher rating
    candidates.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return b.rating - a.rating;
    });

    return candidates.slice(0, limit);
  }
}

module.exports = new MatchingService();

const { Op } = require('sequelize');
const { DriverProfile, Ride, User } = require('../models');
const { calculateDistance } = require('../utils/haversine');
const { getIO } = require('../services/socketService');

/**
 * Toggle driver availability (online / offline)
 */
async function toggleAvailability(req, res, next) {
  try {
    const driverProfile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!driverProfile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    const { isAvailable } = req.body;
    driverProfile.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !driverProfile.isAvailable;
    await driverProfile.save();

    res.status(200).json({
      success: true,
      message: `Driver status set to ${driverProfile.isAvailable ? 'ONLINE' : 'OFFLINE'}.`,
      isAvailable: driverProfile.isAvailable
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update driver current GPS location
 */
async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required.'
      });
    }

    const driverProfile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!driverProfile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    driverProfile.currentLatitude = parseFloat(latitude);
    driverProfile.currentLongitude = parseFloat(longitude);
    await driverProfile.save();

    // Check if driver is currently on an active trip and broadcast to rider
    const activeRide = await Ride.findOne({
      where: {
        driverId: req.user.id,
        status: { [Op.in]: ['accepted', 'arrived', 'in_progress'] }
      }
    });

    if (activeRide) {
      const io = getIO();
      if (io) {
        io.to(`ride_${activeRide.id}`).emit('ride:driver_moved', {
          rideId: activeRide.id,
          lat: driverProfile.currentLatitude,
          lng: driverProfile.currentLongitude,
          timestamp: new Date()
        });
        io.to(`user_${activeRide.riderId}`).emit('ride:driver_moved', {
          rideId: activeRide.id,
          lat: driverProfile.currentLatitude,
          lng: driverProfile.currentLongitude,
          timestamp: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully.',
      coordinates: {
        latitude: driverProfile.currentLatitude,
        longitude: driverProfile.currentLongitude
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Driver searches and filters pending ride requests by proximity and location
 */
async function getAvailableRequests(req, res, next) {
  try {
    const driverProfile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!driverProfile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    const { maxDistanceKm = 15, location } = req.query;

    const requestedRides = await Ride.findAll({
      where: { status: 'requested' },
      include: [
        {
          model: User,
          as: 'rider',
          attributes: ['id', 'name', 'phone', 'avatarUrl']
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    const driverLat = driverProfile.currentLatitude;
    const driverLng = driverProfile.currentLongitude;

    const results = [];

    for (const ride of requestedRides) {
      // Filter by location substring if provided
      if (location && !ride.pickupAddress.toLowerCase().includes(location.toLowerCase())) {
        continue;
      }

      let distanceToPickup = 0;
      if (driverLat !== null && driverLng !== null) {
        distanceToPickup = calculateDistance(driverLat, driverLng, ride.pickupLatitude, ride.pickupLongitude);
        if (distanceToPickup > parseFloat(maxDistanceKm)) {
          continue;
        }
      }

      results.push({
        ride,
        distanceToPickupKm: distanceToPickup,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        fare: ride.totalFare,
        driverEarnings: ride.driverEarnings
      });
    }

    // Sort by nearest pickup distance
    results.sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);

    res.status(200).json({
      success: true,
      count: results.length,
      requests: results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver earnings breakdown (today, this week, all time)
 */
async function getEarnings(req, res, next) {
  try {
    const driverId = req.user.id;
    const driverProfile = await DriverProfile.findOne({ where: { userId: driverId } });

    if (!driverProfile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const completedRides = await Ride.findAll({
      where: {
        driverId,
        status: 'completed'
      },
      order: [['completedAt', 'DESC']]
    });

    let todayEarnings = 0;
    let weekEarnings = 0;
    let todayTrips = 0;
    let weekTrips = 0;

    completedRides.forEach((r) => {
      const compDate = new Date(r.completedAt);
      if (compDate >= startOfToday) {
        todayEarnings += r.driverEarnings;
        todayTrips += 1;
      }
      if (compDate >= startOfWeek) {
        weekEarnings += r.driverEarnings;
        weekTrips += 1;
      }
    });

    res.status(200).json({
      success: true,
      earnings: {
        today: Math.round(todayEarnings * 100) / 100,
        todayTrips,
        thisWeek: Math.round(weekEarnings * 100) / 100,
        weekTrips,
        allTime: Math.round(driverProfile.totalEarnings * 100) / 100,
        totalTrips: driverProfile.totalRides,
        averageRating: driverProfile.averageRating,
        totalRatings: driverProfile.totalRatings
      },
      recentCompletedTrips: completedRides.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  toggleAvailability,
  updateLocation,
  getAvailableRequests,
  getEarnings
};

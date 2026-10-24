const { Op } = require('sequelize');
const { Ride, User, DriverProfile, Review } = require('../models');
const mapboxService = require('../services/mapboxService');
const fareService = require('../services/fareService');
const matchingService = require('../services/matchingService');
const { socketEvents } = require('../services/socketService');

/**
 * Calculate upfront route and fare estimate without creating a booking.
 */
async function estimateRide(req, res, next) {
  try {
    const {
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      rideType = 'economy'
    } = req.body;

    const origin = { lat: pickupLatitude, lng: pickupLongitude };
    const destination = { lat: dropoffLatitude, lng: dropoffLongitude };

    // Get driving route
    const route = await mapboxService.getRoute(origin, destination);

    // Count local demand vs supply for surge estimation
    const pendingRequests = await Ride.count({ where: { status: 'requested' } });
    const availableDrivers = await DriverProfile.count({ where: { isAvailable: true } });

    // Calculate fare for requested type
    const fareEstimate = fareService.calculateFare({
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      rideType,
      pendingRequests,
      availableDrivers
    });

    // Provide comparisons for all vehicle tiers
    const tiers = ['economy', 'comfort', 'xl'].map((type) => {
      const estimate = fareService.calculateFare({
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        rideType: type,
        pendingRequests,
        availableDrivers
      });
      return {
        rideType: type,
        totalFare: estimate.totalFare,
        currency: estimate.currency,
        surgeMultiplier: estimate.breakdown.surgeMultiplier,
        isSurgeActive: estimate.isSurgeActive
      };
    });

    res.status(200).json({
      success: true,
      route: {
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        geometry: route.geometry,
        routingSource: route.source
      },
      fareEstimate,
      availableOptions: tiers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit a new ride request and find nearest available drivers.
 */
async function requestRide(req, res, next) {
  try {
    const riderId = req.user.id;
    const {
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      rideType = 'economy',
      paymentMethod = 'cash'
    } = req.body;

    // Check if rider already has an active ongoing ride
    const existingActiveRide = await Ride.findOne({
      where: {
        riderId,
        status: { [Op.in]: ['requested', 'accepted', 'arrived', 'in_progress'] }
      }
    });

    if (existingActiveRide) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active ride request in progress.',
        activeRideId: existingActiveRide.id
      });
    }

    // Get route and travel time
    const origin = { lat: pickupLatitude, lng: pickupLongitude };
    const destination = { lat: dropoffLatitude, lng: dropoffLongitude };
    const route = await mapboxService.getRoute(origin, destination);

    // Calculate surge and fare
    const pendingRequests = await Ride.count({ where: { status: 'requested' } });
    const availableDrivers = await DriverProfile.count({ where: { isAvailable: true } });

    const fare = fareService.calculateFare({
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      rideType,
      pendingRequests,
      availableDrivers
    });

    // Create ride in database
    const newRide = await Ride.create({
      riderId,
      pickupAddress: pickupAddress.trim(),
      pickupLatitude,
      pickupLongitude,
      dropoffAddress: dropoffAddress.trim(),
      dropoffLatitude,
      dropoffLongitude,
      rideType,
      status: 'requested',
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      baseFare: fare.breakdown.baseFare,
      distanceFare: fare.breakdown.distanceFare,
      timeFare: fare.breakdown.timeFare,
      surgeMultiplier: fare.breakdown.surgeMultiplier,
      totalFare: fare.totalFare,
      driverEarnings: fare.driverEarnings,
      platformFee: fare.platformFee,
      paymentMethod,
      paymentStatus: 'pending',
      routePolyline: JSON.stringify(route.geometry),
      requestedAt: new Date()
    });

    // Find nearby candidate drivers within radius
    const candidates = await matchingService.findNearestDrivers({
      pickupLat: pickupLatitude,
      pickupLng: pickupLongitude,
      rideType,
      limit: 5
    });

    const candidateDriverIds = candidates.map((c) => c.driverId);

    // Broadcast new ride to nearby candidate drivers via WebSocket
    socketEvents.notifyNewRideRequest(
      {
        id: newRide.id,
        riderName: req.user.name,
        riderPhone: req.user.phone,
        pickupAddress: newRide.pickupAddress,
        dropoffAddress: newRide.dropoffAddress,
        distanceKm: newRide.distanceKm,
        durationMinutes: newRide.durationMinutes,
        totalFare: newRide.totalFare,
        rideType: newRide.rideType,
        pickupCoordinates: { lat: pickupLatitude, lng: pickupLongitude }
      },
      candidateDriverIds
    );

    res.status(201).json({
      success: true,
      message: 'Ride requested successfully. Searching for nearby drivers.',
      ride: newRide,
      nearbyDriversFound: candidates.length,
      nearestDrivers: candidates
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single ride details by ID
 */
async function getRideById(req, res, next) {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id, {
      include: [
        {
          model: User,
          as: 'rider',
          attributes: ['id', 'name', 'phone', 'email', 'avatarUrl']
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'phone', 'avatarUrl'],
          include: [{ model: DriverProfile, as: 'driverProfile' }]
        },
        {
          model: Review,
          as: 'review'
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Role-based authorization: Rider, assigned Driver, or Admin
    const isRider = ride.riderId === req.user.id;
    const isDriver = ride.driverId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isRider && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this ride.'
      });
    }

    res.status(200).json({ success: true, ride });
  } catch (error) {
    next(error);
  }
}

/**
 * List rides with search and filters
 */
async function getAllRides(req, res, next) {
  try {
    const {
      status,
      rideType,
      destination,
      minRating,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Role-based visibility
    if (req.user.role === 'rider') {
      where.riderId = req.user.id;
    } else if (req.user.role === 'driver') {
      // Drivers can view rides assigned to them, or requested rides if filtering
      if (status === 'requested') {
        where.status = 'requested';
      } else {
        where.driverId = req.user.id;
      }
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (rideType) {
      where.rideType = rideType;
    }

    if (destination) {
      where.dropoffAddress = { [Op.like]: `%${destination}%` };
    }

    if (startDate && endDate) {
      where.requestedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: rides } = await Ride.findAndCountAll({
      where,
      include: [
        { model: User, as: 'rider', attributes: ['id', 'name', 'phone'] },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'phone'],
          include: [{ model: DriverProfile, as: 'driverProfile' }]
        }
      ],
      order: [['requestedAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    // Optional filter by driver rating if requested
    let filteredRides = rides;
    if (minRating) {
      const ratingThreshold = parseFloat(minRating);
      filteredRides = rides.filter(
        (r) => r.driver && r.driver.driverProfile && r.driver.driverProfile.averageRating >= ratingThreshold
      );
    }

    res.status(200).json({
      success: true,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      rides: filteredRides
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Driver accepts a requested ride
 */
async function acceptRide(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const driverProfile = await DriverProfile.findOne({ where: { userId: driverId } });
    if (!driverProfile) {
      return res.status(403).json({ success: false, message: 'Driver profile not found.' });
    }

    // Check if driver is already on an active ride
    const driverActiveRide = await Ride.findOne({
      where: {
        driverId,
        status: { [Op.in]: ['accepted', 'arrived', 'in_progress'] }
      }
    });

    if (driverActiveRide) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active ride in progress. Complete it first.'
      });
    }

    const ride = await Ride.findByPk(id, {
      include: [{ model: User, as: 'rider', attributes: ['id', 'name', 'phone'] }]
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride request not found.' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept ride. It is currently in '${ride.status}' status.`
      });
    }

    // Assign driver to ride
    ride.driverId = driverId;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    await ride.save();

    // Mark driver as occupied
    driverProfile.isAvailable = false;
    await driverProfile.save();

    // Notify rider in real time
    socketEvents.notifyRideAccepted(ride.riderId, ride, {
      id: driverId,
      name: req.user.name,
      phone: req.user.phone,
      vehicleModel: driverProfile.vehicleModel,
      vehiclePlate: driverProfile.vehiclePlate,
      vehicleColor: driverProfile.vehicleColor,
      rating: driverProfile.averageRating,
      coordinates: {
        lat: driverProfile.currentLatitude,
        lng: driverProfile.currentLongitude
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully.',
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update ride progression status: arrived, in_progress, completed
 */
async function updateRideStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validTransitions = ['arrived', 'in_progress', 'completed'];

    if (!validTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition. Allowed values: ${validTransitions.join(', ')}`
      });
    }

    const ride = await Ride.findByPk(id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Verify requesting user is the assigned driver or admin
    if (ride.driverId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned driver can update the progress of this ride.'
      });
    }

    // Validate lifecycle transitions
    if (status === 'arrived' && ride.status !== 'accepted') {
      return res.status(400).json({ success: false, message: "Ride must be in 'accepted' state before 'arrived'." });
    }

    if (status === 'in_progress' && !['accepted', 'arrived'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Ride must be 'accepted' or 'arrived' before starting." });
    }

    if (status === 'completed' && ride.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: "Ride must be 'in_progress' before completing." });
    }

    ride.status = status;

    if (status === 'in_progress') {
      ride.startedAt = new Date();
    } else if (status === 'completed') {
      ride.completedAt = new Date();
      ride.paymentStatus = 'paid';

      // Update driver statistics & availability
      const driverProfile = await DriverProfile.findOne({ where: { userId: ride.driverId } });
      if (driverProfile) {
        driverProfile.isAvailable = true;
        driverProfile.totalRides += 1;
        driverProfile.totalEarnings += ride.driverEarnings;
        await driverProfile.save();
      }
    }

    await ride.save();

    // Broadcast real-time status update
    socketEvents.notifyStatusUpdate(ride.id, ride.riderId, ride.driverId, status);

    res.status(200).json({
      success: true,
      message: `Ride status updated to '${status}'.`,
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel ride
 */
async function cancelRide(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const ride = await Ride.findByPk(id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Cannot cancel completed or already cancelled rides
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ride that is already ${ride.status}.`
      });
    }

    // If ride is in_progress, cancellation is restricted
    if (ride.status === 'in_progress' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Ride is currently in progress and cannot be cancelled without admin support.'
      });
    }

    const cancelledByRole = req.user.role;
    ride.status = 'cancelled';
    ride.cancelledBy = cancelledByRole;
    ride.cancellationReason = reason.trim();
    ride.cancelledAt = new Date();
    await ride.save();

    // Release driver if assigned
    if (ride.driverId) {
      await DriverProfile.update(
        { isAvailable: true },
        { where: { userId: ride.driverId } }
      );
    }

    // Broadcast cancellation
    socketEvents.notifyRideCancelled(ride.id, ride.riderId, ride.driverId, reason, cancelledByRole);

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully.',
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search nearby active drivers around given coordinates
 */
async function getNearbyDrivers(req, res, next) {
  try {
    const { lat, lng, radiusKm, rideType } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters lat and lng are required.'
      });
    }

    const drivers = await matchingService.findNearestDrivers({
      pickupLat: parseFloat(lat),
      pickupLng: parseFloat(lng),
      rideType: rideType || null,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10
    });

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  estimateRide,
  requestRide,
  getRideById,
  getAllRides,
  acceptRide,
  updateRideStatus,
  cancelRide,
  getNearbyDrivers
};

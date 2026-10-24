const { sequelize, User, DriverProfile, Ride, Review } = require('../models');
const { connectDatabase } = require('../config/database');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    await connectDatabase();
    logger.info('Resetting database tables for seeding...');

    // Drop and re-sync fresh tables
    await sequelize.sync({ force: true });

    // 1. Create Admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@rideshare.com',
      phone: '+919000000001',
      password: 'password123',
      role: 'admin'
    });

    // 2. Create Riders
    const rider1 = await User.create({
      name: 'Aarav Mehta',
      email: 'aarav@rideshare.com',
      phone: '+919820011223',
      password: 'password123',
      role: 'rider'
    });

    const rider2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@rideshare.com',
      phone: '+919820044556',
      password: 'password123',
      role: 'rider'
    });

    // 3. Create Drivers & Driver Profiles
    const driverUser1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@rideshare.com',
      phone: '+919811122334',
      password: 'password123',
      role: 'driver'
    });

    const profile1 = await DriverProfile.create({
      userId: driverUser1.id,
      vehicleModel: 'Maruti Suzuki Dzire',
      vehiclePlate: 'MH-02-AK-4521',
      vehicleColor: 'Silver',
      vehicleType: 'economy',
      licenseNumber: 'DL-142011009876',
      isAvailable: true,
      currentLatitude: 19.0680,
      currentLongitude: 72.8690,
      averageRating: 4.85,
      totalRatings: 12,
      totalRides: 14,
      totalEarnings: 3200.00
    });

    const driverUser2 = await User.create({
      name: 'Vikram Singh',
      email: 'vikram@rideshare.com',
      phone: '+919822233445',
      password: 'password123',
      role: 'driver'
    });

    const profile2 = await DriverProfile.create({
      userId: driverUser2.id,
      vehicleModel: 'Honda City',
      vehiclePlate: 'MH-03-BZ-8822',
      vehicleColor: 'Pearl White',
      vehicleType: 'comfort',
      licenseNumber: 'DL-142012001122',
      isAvailable: true,
      currentLatitude: 19.0720,
      currentLongitude: 72.8710,
      averageRating: 4.90,
      totalRatings: 18,
      totalRides: 20,
      totalEarnings: 5400.00
    });

    const driverUser3 = await User.create({
      name: 'Anita Desai',
      email: 'anita@rideshare.com',
      phone: '+919833344556',
      password: 'password123',
      role: 'driver'
    });

    const profile3 = await DriverProfile.create({
      userId: driverUser3.id,
      vehicleModel: 'Toyota Innova Crysta',
      vehiclePlate: 'MH-01-CP-7711',
      vehicleColor: 'Grey',
      vehicleType: 'xl',
      licenseNumber: 'DL-142013009988',
      isAvailable: true,
      currentLatitude: 19.0600,
      currentLongitude: 72.8650,
      averageRating: 4.95,
      totalRatings: 25,
      totalRides: 28,
      totalEarnings: 8900.00
    });

    const driverUser4 = await User.create({
      name: 'Sunil Patil',
      email: 'sunil@rideshare.com',
      phone: '+919844455667',
      password: 'password123',
      role: 'driver'
    });

    const profile4 = await DriverProfile.create({
      userId: driverUser4.id,
      vehicleModel: 'Hyundai Aura',
      vehiclePlate: 'MH-04-DE-3344',
      vehicleColor: 'Bronze',
      vehicleType: 'economy',
      licenseNumber: 'DL-142014005544',
      isAvailable: false, // offline
      currentLatitude: 19.0800,
      currentLongitude: 72.8800,
      averageRating: 4.70,
      totalRatings: 10,
      totalRides: 11,
      totalEarnings: 2100.00
    });

    // 4. Create Historical Rides over past days
    const now = new Date();

    const ride1 = await Ride.create({
      riderId: rider1.id,
      driverId: driverUser1.id,
      pickupAddress: 'Bandra Station West, Mumbai',
      pickupLatitude: 19.0544,
      pickupLongitude: 72.8402,
      dropoffAddress: 'Bandra Kurla Complex (BKC), Mumbai',
      dropoffLatitude: 19.0657,
      dropoffLongitude: 72.8687,
      rideType: 'economy',
      status: 'completed',
      distanceKm: 4.5,
      durationMinutes: 16,
      baseFare: 50.0,
      distanceFare: 54.0,
      timeFare: 40.0,
      surgeMultiplier: 1.0,
      totalFare: 151.2,
      driverEarnings: 115.2,
      platformFee: 36.0,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      requestedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
      acceptedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000 + 60000),
      startedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000 + 300000),
      completedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000 + 1300000)
    });

    const ride2 = await Ride.create({
      riderId: rider2.id,
      driverId: driverUser2.id,
      pickupAddress: 'Chhatrapati Shivaji Maharaj Terminus (CSMT), Mumbai',
      pickupLatitude: 18.9401,
      pickupLongitude: 72.8347,
      dropoffAddress: 'Marine Drive Promenade, Mumbai',
      dropoffLatitude: 18.9432,
      dropoffLongitude: 72.8230,
      rideType: 'comfort',
      status: 'completed',
      distanceKm: 3.2,
      durationMinutes: 12,
      baseFare: 62.5,
      distanceFare: 48.0,
      timeFare: 30.0,
      surgeMultiplier: 1.4,
      totalFare: 206.5,
      driverEarnings: 157.3,
      platformFee: 49.2,
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      requestedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
      acceptedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000 + 90000),
      startedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000 + 360000),
      completedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000 + 1080000)
    });

    const ride3 = await Ride.create({
      riderId: rider1.id,
      driverId: driverUser3.id,
      pickupAddress: 'Andheri Metro Station, Mumbai',
      pickupLatitude: 19.1197,
      pickupLongitude: 72.8464,
      dropoffAddress: 'Juhu Tara Road, Juhu Beach, Mumbai',
      dropoffLatitude: 19.0988,
      dropoffLongitude: 72.8264,
      rideType: 'xl',
      status: 'completed',
      distanceKm: 6.8,
      durationMinutes: 24,
      baseFare: 77.5,
      distanceFare: 126.5,
      timeFare: 60.0,
      surgeMultiplier: 1.0,
      totalFare: 277.2,
      driverEarnings: 211.2,
      platformFee: 66.0,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      requestedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
      acceptedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000 + 80000),
      startedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000 + 300000),
      completedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000 + 1740000)
    });

    const ride4 = await Ride.create({
      riderId: rider2.id,
      driverId: driverUser1.id,
      pickupAddress: 'Powai Hiranandani Gardens, Mumbai',
      pickupLatitude: 19.1176,
      pickupLongitude: 72.9060,
      dropoffAddress: 'Ghatkopar Railway Station, Mumbai',
      dropoffLatitude: 19.0864,
      dropoffLongitude: 72.9082,
      rideType: 'economy',
      status: 'completed',
      distanceKm: 5.1,
      durationMinutes: 19,
      baseFare: 50.0,
      distanceFare: 61.2,
      timeFare: 47.5,
      surgeMultiplier: 1.0,
      totalFare: 166.6,
      driverEarnings: 127.0,
      platformFee: 39.6,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      requestedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
      acceptedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000 + 120000),
      startedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000 + 400000),
      completedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000 + 1540000)
    });

    const rideCancelled = await Ride.create({
      riderId: rider1.id,
      driverId: null,
      pickupAddress: 'Dadar TT Circle, Mumbai',
      pickupLatitude: 19.0178,
      pickupLongitude: 72.8478,
      dropoffAddress: 'Worli Sea Face, Mumbai',
      dropoffLatitude: 19.0068,
      dropoffLongitude: 72.8159,
      rideType: 'economy',
      status: 'cancelled',
      cancellationReason: 'Rider found alternative travel',
      cancelledBy: 'rider',
      distanceKm: 3.5,
      durationMinutes: 14,
      baseFare: 50.0,
      distanceFare: 42.0,
      timeFare: 35.0,
      surgeMultiplier: 1.0,
      totalFare: 133.35,
      driverEarnings: 0,
      platformFee: 0,
      requestedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
      cancelledAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000 + 180000)
    });

    // 5. Create Reviews for Completed Rides
    await Review.create({
      rideId: ride1.id,
      riderId: rider1.id,
      driverId: driverUser1.id,
      rating: 5,
      comment: 'Very polite driver, car was clean and ride was on time!'
    });

    await Review.create({
      rideId: ride2.id,
      riderId: rider2.id,
      driverId: driverUser2.id,
      rating: 5,
      comment: 'Smooth journey through Marine Drive. Excellent driving skills.'
    });

    await Review.create({
      rideId: ride3.id,
      riderId: rider1.id,
      driverId: driverUser3.id,
      rating: 5,
      comment: 'Spacious car for our family group. Highly recommended.'
    });

    await Review.create({
      rideId: ride4.id,
      riderId: rider2.id,
      driverId: driverUser1.id,
      rating: 4,
      comment: 'Good ride, reached destination safely despite minor traffic.'
    });

    logger.info('=======================================================');
    logger.info(' Database seeded successfully with demo data:');
    logger.info(' - 1 Administrator (admin@rideshare.com / password123)');
    logger.info(' - 2 Riders (aarav@rideshare.com, priya@rideshare.com)');
    logger.info(' - 4 Drivers (rajesh@rideshare.com, vikram@rideshare.com, etc.)');
    logger.info(' - 5 Historical & cancelled rides');
    logger.info(' - 4 Driver reviews and ratings');
    logger.info('=======================================================');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed database:', error.message);
    process.exit(1);
  }
}

seedDatabase();

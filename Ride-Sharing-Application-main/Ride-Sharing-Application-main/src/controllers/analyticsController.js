const { Op } = require('sequelize');
const { Ride, User, DriverProfile, Review, sequelize } = require('../models');

/**
 * Overview analytics summary for dashboard KPIs
 */
async function getOverview(req, res, next) {
  try {
    const totalUsers = await User.count();
    const totalRiders = await User.count({ where: { role: 'rider' } });
    const totalDrivers = await User.count({ where: { role: 'driver' } });
    const activeDrivers = await DriverProfile.count({ where: { isAvailable: true } });

    const totalRides = await Ride.count();
    const completedRides = await Ride.count({ where: { status: 'completed' } });
    const cancelledRides = await Ride.count({ where: { status: 'cancelled' } });

    const allCompleted = await Ride.findAll({
      where: { status: 'completed' },
      attributes: ['totalFare', 'driverEarnings', 'platformFee', 'distanceKm', 'durationMinutes']
    });

    const totalRevenue = allCompleted.reduce((sum, r) => sum + (r.totalFare || 0), 0);
    const platformEarnings = allCompleted.reduce((sum, r) => sum + (r.platformFee || 0), 0);
    const driverPayouts = allCompleted.reduce((sum, r) => sum + (r.driverEarnings || 0), 0);
    const totalDistance = allCompleted.reduce((sum, r) => sum + (r.distanceKm || 0), 0);

    const avgDistance = completedRides > 0 ? totalDistance / completedRides : 0;
    const avgFare = completedRides > 0 ? totalRevenue / completedRides : 0;

    res.status(200).json({
      success: true,
      metrics: {
        users: {
          total: totalUsers,
          riders: totalRiders,
          drivers: totalDrivers,
          activeDriversOnline: activeDrivers
        },
        rides: {
          total: totalRides,
          completed: completedRides,
          cancelled: cancelledRides,
          completionRate: totalRides > 0 ? Math.round((completedRides / totalRides) * 100) : 0
        },
        financials: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          platformProfit: Math.round(platformEarnings * 100) / 100,
          driverPayouts: Math.round(driverPayouts * 100) / 100,
          currency: 'INR'
        },
        serviceQuality: {
          averageTripDistanceKm: Math.round(avgDistance * 100) / 100,
          averageFarePerTrip: Math.round(avgFare * 100) / 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ride volume trends over the past 7 days (formatted for Chart.js)
 */
async function getRideTrends(req, res, next) {
  try {
    const days = 7;
    const labels = [];
    const completedCounts = [];
    const cancelledCounts = [];
    const totalCounts = [];

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const dayLabel = dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      labels.push(dayLabel);

      const completed = await Ride.count({
        where: {
          status: 'completed',
          requestedAt: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      const cancelled = await Ride.count({
        where: {
          status: 'cancelled',
          requestedAt: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      const total = await Ride.count({
        where: {
          requestedAt: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      completedCounts.push(completed);
      cancelledCounts.push(cancelled);
      totalCounts.push(total);
    }

    res.status(200).json({
      success: true,
      chart: {
        labels,
        datasets: [
          { label: 'Completed Rides', data: completedCounts, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
          { label: 'Cancelled Rides', data: cancelledCounts, borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' },
          { label: 'Total Volume', data: totalCounts, borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.2)' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Driver performance metrics and ranking
 */
async function getDriverPerformance(req, res, next) {
  try {
    const drivers = await DriverProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'avatarUrl']
        }
      ],
      order: [['totalEarnings', 'DESC']],
      limit: 15
    });

    const performanceList = await Promise.all(
      drivers.map(async (dp) => {
        const assignedRides = await Ride.count({ where: { driverId: dp.userId } });
        const completedRides = await Ride.count({ where: { driverId: dp.userId, status: 'completed' } });
        const cancelledRides = await Ride.count({ where: { driverId: dp.userId, status: 'cancelled' } });

        const completionRate = assignedRides > 0 ? Math.round((completedRides / assignedRides) * 100) : 0;

        return {
          driverId: dp.userId,
          name: dp.user ? dp.user.name : 'Unknown',
          vehicleModel: dp.vehicleModel,
          vehiclePlate: dp.vehiclePlate,
          vehicleType: dp.vehicleType,
          rating: dp.averageRating,
          totalRatings: dp.totalRatings,
          totalRides: dp.totalRides,
          completionRate: `${completionRate}%`,
          totalEarnings: Math.round(dp.totalEarnings * 100) / 100,
          isOnline: dp.isAvailable
        };
      })
    );

    res.status(200).json({
      success: true,
      count: performanceList.length,
      drivers: performanceList
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Earnings and revenue trends over past 7 days
 */
async function getEarningsOverTime(req, res, next) {
  try {
    const days = 7;
    const labels = [];
    const revenueData = [];
    const driverEarningsData = [];
    const platformProfitData = [];

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      labels.push(dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));

      const dayRides = await Ride.findAll({
        where: {
          status: 'completed',
          completedAt: { [Op.between]: [dayStart, dayEnd] }
        },
        attributes: ['totalFare', 'driverEarnings', 'platformFee']
      });

      const dayRevenue = dayRides.reduce((acc, r) => acc + (r.totalFare || 0), 0);
      const dayDriver = dayRides.reduce((acc, r) => acc + (r.driverEarnings || 0), 0);
      const dayPlatform = dayRides.reduce((acc, r) => acc + (r.platformFee || 0), 0);

      revenueData.push(Math.round(dayRevenue));
      driverEarningsData.push(Math.round(dayDriver));
      platformProfitData.push(Math.round(dayPlatform));
    }

    res.status(200).json({
      success: true,
      chart: {
        labels,
        datasets: [
          { label: 'Total Revenue (INR)', data: revenueData, backgroundColor: '#3B82F6' },
          { label: 'Driver Earnings (INR)', data: driverEarningsData, backgroundColor: '#10B981' },
          { label: 'Platform Profit (INR)', data: platformProfitData, backgroundColor: '#F59E0B' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getRideTrends,
  getDriverPerformance,
  getEarningsOverTime
};

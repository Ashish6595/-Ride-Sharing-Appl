const { Review, Ride, User, DriverProfile } = require('../models');

/**
 * Submit post-ride driver rating and review
 */
async function createReview(req, res, next) {
  try {
    const riderId = req.user.id;
    const { rideId, rating, comment } = req.body;

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Verify ride was taken by this rider
    if (ride.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: 'You can only review rides that you have booked.'
      });
    }

    // Must be completed before reviewing
    if (ride.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot review a ride with status '${ride.status}'. Only completed rides can be reviewed.`
      });
    }

    // Check if ride already reviewed
    const existingReview = await Review.findOne({ where: { rideId } });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'A review has already been submitted for this ride.'
      });
    }

    const driverId = ride.driverId;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'No driver was assigned to this ride.' });
    }

    // Create review
    const review = await Review.create({
      rideId,
      riderId,
      driverId,
      rating: parseInt(rating, 10),
      comment: comment ? comment.trim() : null
    });

    // Recalculate driver's overall average rating
    const driverReviews = await Review.findAll({ where: { driverId } });
    const totalScore = driverReviews.reduce((sum, rev) => sum + rev.rating, 0);
    const newAverage = Math.round((totalScore / driverReviews.length) * 100) / 100;

    await DriverProfile.update(
      {
        averageRating: newAverage,
        totalRatings: driverReviews.length
      },
      { where: { userId: driverId } }
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Driver rating updated.',
      review,
      driverNewRating: newAverage
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all reviews for a specific driver
 */
async function getDriverReviews(req, res, next) {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { driverId: parseInt(driverId, 10) },
      include: [
        {
          model: User,
          as: 'rider',
          attributes: ['id', 'name', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    const driverProfile = await DriverProfile.findOne({ where: { userId: driverId } });

    res.status(200).json({
      success: true,
      driverStats: {
        averageRating: driverProfile ? driverProfile.averageRating : 0,
        totalRatings: count
      },
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      reviews
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReview,
  getDriverReviews
};

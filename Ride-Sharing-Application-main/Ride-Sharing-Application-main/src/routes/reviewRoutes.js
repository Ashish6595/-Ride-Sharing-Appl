const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validateReview } = require('../middleware/validate');

// Rider creates a review for completed ride
router.post('/', protect, authorize('rider'), validateReview, reviewController.createReview);

// Public or authenticated driver reviews
router.get('/driver/:driverId', reviewController.getDriverReviews);

module.exports = router;

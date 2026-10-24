const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validateRideRequest } = require('../middleware/validate');

// Public or protected fare calculation & nearby drivers
router.post('/estimate', validateRideRequest, rideController.estimateRide);
router.get('/nearby-drivers', rideController.getNearbyDrivers);

// Protected ride operations
router.post('/request', protect, authorize('rider'), validateRideRequest, rideController.requestRide);
router.get('/', protect, rideController.getAllRides);
router.get('/:id', protect, rideController.getRideById);

// Driver actions
router.put('/:id/accept', protect, authorize('driver'), rideController.acceptRide);
router.put('/:id/status', protect, authorize('driver', 'admin'), rideController.updateRideStatus);

// Cancellation
router.put('/:id/cancel', protect, rideController.cancelRide);

module.exports = router;

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All driver routes require authenticated driver role
router.use(protect);
router.use(authorize('driver'));

router.put('/availability', driverController.toggleAvailability);
router.put('/location', driverController.updateLocation);
router.get('/requests', driverController.getAvailableRequests);
router.get('/earnings', driverController.getEarnings);

module.exports = router;

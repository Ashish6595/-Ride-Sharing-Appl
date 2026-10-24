const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// Protect analytics routes - accessible to Admins and Drivers
router.use(protect);
router.use(authorize('admin', 'driver'));

router.get('/overview', analyticsController.getOverview);
router.get('/trends', analyticsController.getRideTrends);
router.get('/driver-performance', analyticsController.getDriverPerformance);
router.get('/earnings', analyticsController.getEarningsOverTime);

module.exports = router;

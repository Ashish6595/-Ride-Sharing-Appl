const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

// Protected export endpoints
router.use(protect);

router.get('/rides/csv', exportController.exportCSV);
router.get('/rides/pdf', exportController.exportPDF);

module.exports = router;

const { Op } = require('sequelize');
const { Ride, User } = require('../models');
const exportService = require('../services/exportService');

/**
 * Fetch rides based on requester role and optional filters
 */
async function fetchUserRides(req) {
  const { status, startDate, endDate } = req.query;
  const where = {};

  if (req.user.role === 'rider') {
    where.riderId = req.user.id;
  } else if (req.user.role === 'driver') {
    where.driverId = req.user.id;
  }
  // Admin can view all

  if (status && status !== 'all') {
    where.status = status;
  }

  if (startDate && endDate) {
    where.requestedAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  return await Ride.findAll({
    where,
    include: [
      { model: User, as: 'rider', attributes: ['id', 'name', 'phone', 'email'] },
      { model: User, as: 'driver', attributes: ['id', 'name', 'phone', 'email'] }
    ],
    order: [['requestedAt', 'DESC']]
  });
}

/**
 * Export ride history as downloadable CSV
 */
async function exportCSV(req, res, next) {
  try {
    const rides = await fetchUserRides(req);

    if (rides.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No ride records found matching your filter criteria to export.'
      });
    }

    const csvData = exportService.generateCSV(rides);
    const filename = `ride_history_${req.user.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

/**
 * Export ride history as downloadable PDF statement
 */
async function exportPDF(req, res, next) {
  try {
    const rides = await fetchUserRides(req);

    if (rides.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No ride records found matching your filter criteria to export.'
      });
    }

    const filename = `ride_statement_${req.user.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    exportService.generatePDF(rides, req.user, res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  exportCSV,
  exportPDF
};

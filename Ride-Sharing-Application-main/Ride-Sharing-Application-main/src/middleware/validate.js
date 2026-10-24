/**
 * Request validation helpers to enforce clean, robust API payloads.
 */

// Helper to validate coordinate bounds
function isValidLatitude(lat) {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng) {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
}

/**
 * Validate user registration payload
 */
function validateRegistration(req, res, next) {
  const { name, email, phone, password, role } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!phone || phone.trim().length < 7) {
    return res.status(400).json({ success: false, message: 'Please provide a valid contact phone number.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  if (role && !['rider', 'driver', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be either rider, driver, or admin.' });
  }

  // If driver role, validate vehicle details
  if (role === 'driver') {
    const { vehicleModel, vehiclePlate, licenseNumber } = req.body;
    if (!vehicleModel || !vehiclePlate || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Driver registration requires vehicleModel, vehiclePlate, and licenseNumber.'
      });
    }
  }

  next();
}

/**
 * Validate user login payload
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  next();
}

/**
 * Validate ride request and estimation payload
 */
function validateRideRequest(req, res, next) {
  const {
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    dropoffAddress,
    dropoffLatitude,
    dropoffLongitude
  } = req.body;

  if (!pickupAddress || !dropoffAddress) {
    return res.status(400).json({
      success: false,
      message: 'Both pickupAddress and dropoffAddress text descriptions are required.'
    });
  }

  const pLat = parseFloat(pickupLatitude);
  const pLng = parseFloat(pickupLongitude);
  const dLat = parseFloat(dropoffLatitude);
  const dLng = parseFloat(dropoffLongitude);

  if (!isValidLatitude(pLat) || !isValidLongitude(pLng)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pickup coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.'
    });
  }

  if (!isValidLatitude(dLat) || !isValidLongitude(dLng)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid dropoff coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.'
    });
  }

  // Ensure pickup and dropoff are not identical
  if (pLat === dLat && pLng === dLng) {
    return res.status(400).json({
      success: false,
      message: 'Pickup location and destination cannot be the exact same point.'
    });
  }

  // Attach parsed numbers for easy use
  req.body.pickupLatitude = pLat;
  req.body.pickupLongitude = pLng;
  req.body.dropoffLatitude = dLat;
  req.body.dropoffLongitude = dLng;

  next();
}

/**
 * Validate driver review payload
 */
function validateReview(req, res, next) {
  const { rideId, rating } = req.body;

  if (!rideId) {
    return res.status(400).json({ success: false, message: 'rideId is required to review a trip.' });
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5 stars.' });
  }

  req.body.rating = numericRating;
  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateRideRequest,
  validateReview
};

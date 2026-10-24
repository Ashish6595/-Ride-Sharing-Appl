const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, DriverProfile } = require('../models');

/**
 * JWT Authentication Middleware
 * Verifies Bearer token in Authorization header and attaches user to req.user.
 */
async function protect(req, res, next) {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication token is missing.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Fetch user from database
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: DriverProfile,
          as: 'driverProfile'
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }
}

module.exports = {
  protect
};

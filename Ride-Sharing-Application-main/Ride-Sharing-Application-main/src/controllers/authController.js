const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, DriverProfile } = require('../models');

// Helper to sign JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Register a new user (rider, driver, or admin)
 */
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'rider',
      avatarUrl,
      vehicleModel,
      vehiclePlate,
      vehicleColor,
      vehicleType,
      licenseNumber
    } = req.body;

    // Check if user with email already exists
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role,
      avatarUrl
    });

    // If driver, create associated DriverProfile
    let driverProfile = null;
    if (role === 'driver') {
      driverProfile = await DriverProfile.create({
        userId: user.id,
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleColor: vehicleColor ? vehicleColor.trim() : 'White',
        vehicleType: vehicleType || 'economy',
        licenseNumber: licenseNumber.trim(),
        isAvailable: true,
        currentLatitude: 19.0760, // Default coordinates for dev demo
        currentLongitude: 72.8777
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} registered successfully.`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        driverProfile: driverProfile ? driverProfile.toJSON() : undefined
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in existing user
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: DriverProfile, as: 'driverProfile' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        driverProfile: user.driverProfile
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: DriverProfile, as: 'driverProfile' }]
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 */
async function updateProfile(req, res, next) {
  try {
    const { name, phone, avatarUrl } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};

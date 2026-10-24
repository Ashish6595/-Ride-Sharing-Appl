const { sequelize } = require('../config/database');
const User = require('./User');
const DriverProfile = require('./DriverProfile');
const Ride = require('./Ride');
const Review = require('./Review');

// User <-> DriverProfile (One-to-One)
User.hasOne(DriverProfile, {
  foreignKey: 'userId',
  as: 'driverProfile',
  onDelete: 'CASCADE'
});
DriverProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Rider <-> Rides (One-to-Many)
User.hasMany(Ride, {
  foreignKey: 'riderId',
  as: 'bookedRides'
});
Ride.belongsTo(User, {
  foreignKey: 'riderId',
  as: 'rider'
});

// Driver <-> Rides (One-to-Many)
User.hasMany(Ride, {
  foreignKey: 'driverId',
  as: 'conductedRides'
});
Ride.belongsTo(User, {
  foreignKey: 'driverId',
  as: 'driver'
});

// Ride <-> Review (One-to-One)
Ride.hasOne(Review, {
  foreignKey: 'rideId',
  as: 'review',
  onDelete: 'CASCADE'
});
Review.belongsTo(Ride, {
  foreignKey: 'rideId',
  as: 'ride'
});

// User (Driver) <-> Reviews (One-to-Many)
User.hasMany(Review, {
  foreignKey: 'driverId',
  as: 'receivedReviews'
});
Review.belongsTo(User, {
  foreignKey: 'driverId',
  as: 'driver'
});

// User (Rider) <-> Reviews (One-to-Many)
User.hasMany(Review, {
  foreignKey: 'riderId',
  as: 'givenReviews'
});
Review.belongsTo(User, {
  foreignKey: 'riderId',
  as: 'rider'
});

module.exports = {
  sequelize,
  User,
  DriverProfile,
  Ride,
  Review
};

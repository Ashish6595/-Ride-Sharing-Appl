const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  riderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  driverId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pickupAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pickupLatitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  pickupLongitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  dropoffAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dropoffLatitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  dropoffLongitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  rideType: {
    type: DataTypes.ENUM('economy', 'comfort', 'xl'),
    defaultValue: 'economy'
  },
  status: {
    type: DataTypes.ENUM('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'requested',
    allowNull: false
  },
  cancellationReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.ENUM('rider', 'driver', 'admin', 'system'),
    allowNull: true
  },
  distanceKm: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  durationMinutes: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  baseFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  distanceFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  timeFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  surgeMultiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0
  },
  totalFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  driverEarnings: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  platformFee: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'wallet', 'upi'),
    defaultValue: 'cash'
  },
  routePolyline: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'rides'
});

module.exports = Ride;

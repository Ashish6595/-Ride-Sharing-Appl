const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DriverProfile = sequelize.define('DriverProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  vehicleModel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehiclePlate: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  vehicleColor: {
    type: DataTypes.STRING,
    defaultValue: 'White'
  },
  vehicleType: {
    type: DataTypes.ENUM('economy', 'comfort', 'xl'),
    defaultValue: 'economy'
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  currentLatitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  currentLongitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  averageRating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    validate: {
      min: 1.0,
      max: 5.0
    }
  },
  totalRatings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalRides: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalEarnings: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  }
}, {
  tableName: 'driver_profiles'
});

module.exports = DriverProfile;

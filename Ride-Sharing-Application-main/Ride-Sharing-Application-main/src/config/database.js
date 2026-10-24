const path = require('path');
const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

// Use SQLite with dedicated database file for dev/prod, or in-memory/test.sqlite for test
const storagePath = isTest
  ? path.join(__dirname, '../../test.sqlite')
  : path.join(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: env === 'development' ? false : false, // Clean student logs
  define: {
    timestamps: true,
    underscored: true
  }
});

const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    // In dev and test, sync tables automatically without data loss
    await sequelize.sync({ alter: true });
    return true;
  } catch (error) {
    console.error('SQLite Database connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDatabase
};

require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'rideshare_dev_fallback_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mapboxToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  
  // Pricing parameters
  fare: {
    baseFare: parseFloat(process.env.BASE_FARE) || 50.0,
    perKmRate: parseFloat(process.env.PER_KM_RATE) || 12.0,
    perMinuteRate: parseFloat(process.env.PER_MINUTE_RATE) || 2.5,
    minimumFare: parseFloat(process.env.MINIMUM_FARE) || 60.0,
    cancellationFee: parseFloat(process.env.CANCELLATION_FEE) || 30.0,
    surgePeakMultiplier: parseFloat(process.env.SURGE_PEAK_MULTIPLIER) || 1.4,
    surgeHighDemandMultiplier: parseFloat(process.env.SURGE_HIGH_DEMAND_MULTIPLIER) || 1.75
  },

  matching: {
    defaultRadiusKm: parseFloat(process.env.DEFAULT_SEARCH_RADIUS_KM) || 10.0
  }
};

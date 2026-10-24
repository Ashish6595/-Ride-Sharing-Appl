const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, DriverProfile, Ride } = require('../src/models');

let riderToken;
let driverToken;
let driverUserId;
let rideId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });

  // 1. Create Rider
  const riderRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Rohan Sharma',
      email: 'rohan.test@rideshare.com',
      phone: '+919876500001',
      password: 'password123',
      role: 'rider'
    });
  riderToken = riderRes.body.token;

  // 2. Create Driver with initial nearby coordinates
  const driverRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Manoj Verma',
      email: 'manoj.test@rideshare.com',
      phone: '+919876500002',
      password: 'password123',
      role: 'driver',
      vehicleModel: 'Maruti Ertiga',
      vehiclePlate: 'MH-03-TEST-999',
      vehicleColor: 'White',
      vehicleType: 'economy',
      licenseNumber: 'DL-TEST-554433'
    });
  driverToken = driverRes.body.token;
  driverUserId = driverRes.body.user.id;

  // Update driver coordinates close to pickup point
  await DriverProfile.update(
    { currentLatitude: 19.0660, currentLongitude: 72.8680, isAvailable: true },
    { where: { userId: driverUserId } }
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('Ride Request & Management Lifecycle API', () => {
  it('should provide route and fare estimation for given coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/rides/estimate')
      .send({
        pickupAddress: 'Bandra Kurla Complex, Mumbai',
        pickupLatitude: 19.0657,
        pickupLongitude: 72.8687,
        dropoffAddress: 'Mumbai Airport Terminal 2',
        dropoffLatitude: 19.0886,
        dropoffLongitude: 72.8679,
        rideType: 'economy'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.route.distanceKm).toBeGreaterThan(0);
    expect(res.body.fareEstimate.totalFare).toBeGreaterThan(0);
    expect(res.body.availableOptions).toHaveLength(3); // economy, comfort, xl
  });

  it('should allow rider to submit a ride request and match nearest driver', async () => {
    const res = await request(app)
      .post('/api/v1/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickupAddress: 'Bandra Kurla Complex, Mumbai',
        pickupLatitude: 19.0657,
        pickupLongitude: 72.8687,
        dropoffAddress: 'Mumbai Airport Terminal 2',
        dropoffLatitude: 19.0886,
        dropoffLongitude: 72.8679,
        rideType: 'economy'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ride.status).toBe('requested');
    expect(res.body.nearbyDriversFound).toBeGreaterThanOrEqual(1);

    rideId = res.body.ride.id;
  });

  it('should prevent rider from creating another ride while one is active', async () => {
    const res = await request(app)
      .post('/api/v1/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickupAddress: 'Another place',
        pickupLatitude: 19.0700,
        pickupLongitude: 72.8700,
        dropoffAddress: 'Another destination',
        dropoffLatitude: 19.0900,
        dropoffLongitude: 72.8900
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should allow driver to accept the requested ride', async () => {
    const res = await request(app)
      .put(`/api/v1/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ride.status).toBe('accepted');
    expect(res.body.ride.driverId).toBe(driverUserId);
  });

  it('should progress ride status through lifecycle to completion', async () => {
    // 1. Mark arrived
    const arrivedRes = await request(app)
      .put(`/api/v1/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'arrived' });
    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.ride.status).toBe('arrived');

    // 2. Start trip
    const startRes = await request(app)
      .put(`/api/v1/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'in_progress' });
    expect(startRes.status).toBe(200);
    expect(startRes.body.ride.status).toBe('in_progress');

    // 3. Complete trip
    const completeRes = await request(app)
      .put(`/api/v1/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'completed' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.ride.status).toBe('completed');
    expect(completeRes.body.ride.paymentStatus).toBe('paid');
  });

  it('should allow rider to submit a rating review for completed ride', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        rideId,
        rating: 5,
        comment: 'Driver was punctual and drove smoothly!'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.rating).toBe(5);
  });

  it('should export user ride history as CSV', async () => {
    const res = await request(app)
      .get('/api/v1/export/rides/csv')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Ride ID');
    expect(res.text).toContain('Bandra Kurla Complex');
  });

  it('should export user ride history as PDF statement', async () => {
    const res = await request(app)
      .get('/api/v1/export/rides/pdf')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});

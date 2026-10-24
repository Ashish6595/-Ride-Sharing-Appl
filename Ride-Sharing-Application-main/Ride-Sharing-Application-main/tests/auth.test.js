const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('User Authentication & RBAC API Endpoints', () => {
  const testRider = {
    name: 'Test Rider',
    email: 'testrider@example.com',
    phone: '+919988776655',
    password: 'password123',
    role: 'rider'
  };

  const testDriver = {
    name: 'Test Driver',
    email: 'testdriver@example.com',
    phone: '+919988776644',
    password: 'password123',
    role: 'driver',
    vehicleModel: 'Swift Dzire',
    vehiclePlate: 'MH-04-TEST-100',
    vehicleColor: 'Silver',
    vehicleType: 'economy',
    licenseNumber: 'DL-TEST-998877'
  };

  it('should successfully register a new rider', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testRider);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testRider.email);
    expect(res.body.user.role).toBe('rider');
    expect(res.body.user.password).toBeUndefined(); // Password must not be exposed
  });

  it('should reject registration if email is already registered', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testRider);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should successfully register a driver with vehicle profile', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testDriver);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('driver');
    expect(res.body.user.driverProfile).toBeDefined();
    expect(res.body.user.driverProfile.vehiclePlate).toBe('MH-04-TEST-100');
  });

  it('should log in with valid credentials and return JWT token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testRider.email,
        password: testRider.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
  });

  it('should fail login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testRider.email,
        password: 'wrong_password'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should access protected profile with valid Bearer token', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testRider.email, password: testRider.password });
    const token = loginRes.body.token;

    // 2. Fetch /me
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testRider.email);
  });
});

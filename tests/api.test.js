const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Theatre = require('../src/models/Theatre');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const SeatLock = require('../src/models/SeatLock');
const Coupon = require('../src/models/Coupon');

const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI);
  }
  const { ensureAdminExists } = require('../src/utils/bootstrapAdmin');
  await ensureAdminExists();
  const { ensureShowsForCurrentDate } = require('../src/scripts/seedDynamicShows');
  await ensureShowsForCurrentDate();
  await mongoose.connection.collection('payments').drop().catch(() => {});
});

test.after(async () => {
  await mongoose.disconnect();
});

test('1. User Registration & Public Role Protection', async (t) => {
  const uniqueEmail = `testuser_${Date.now()}@cineverse.test`;

  await t.test('Public registration creates account with role "user"', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Normal User',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '9876543210',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'user');
    assert(res.body.data.token, 'Token should be returned');
  });

  await t.test('Public registration accepts fullName and preferredCity schema fields', async () => {
    const customEmail = `fullname_${Date.now()}@cineverse.test`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Vikas Kumar',
        email: customEmail,
        password: 'Password123!',
        mobileNumber: '9876543211',
        preferredCity: 'Coimbatore',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.name, 'Vikas Kumar');
    assert.strictEqual(res.body.data.user.role, 'user');
  });

  await t.test('Public registration rejects duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate Tester',
        email: uniqueEmail,
        password: 'AnotherPassword@123',
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('already exists'));
  });

  await t.test('Public registration rejects missing name with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `noname_${Date.now()}@cineverse.test`,
        password: 'Password123!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('name is required'));
  });

  await t.test('Public registration rejects missing email with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'No Email User',
        password: 'Password123!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Email address is required'));
  });

  await t.test('Public registration rejects invalid email format with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bad Email User',
        email: 'invalid-email-format',
        password: 'Password123!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('valid email'));
  });

  await t.test('Public registration rejects short password (< 6 chars) with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Short Pass User',
        email: `shortpass_${Date.now()}@cineverse.test`,
        password: '12345',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('at least 6 characters'));
  });

  await t.test('Public registration rejects / discards role "admin" attempt', async () => {
    const maliciousEmail = `hacker_${Date.now()}@cineverse.test`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fake Admin',
        email: maliciousEmail,
        password: 'Password123!',
        role: 'admin', // Attempt privilege escalation
      });

    assert.strictEqual(res.status, 201);
    // Role MUST remain 'user' strictly!
    assert.strictEqual(res.body.data.user.role, 'user');

    const dbUser = await User.findOne({ email: maliciousEmail });
    assert.strictEqual(dbUser.role, 'user');
  });

  await t.test('Public registration rejects / discards role "theatre" attempt', async () => {
    const theatreEmail = `faketheatre_${Date.now()}@cineverse.test`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fake Theatre Staff',
        email: theatreEmail,
        password: 'Password123!',
        role: 'theatre',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.user.role, 'user');

    const dbUser = await User.findOne({ email: theatreEmail });
    assert.strictEqual(dbUser.role, 'user');
  });
});

test('2. Single Login Page: Mode & Role Verification & Error Handling', async (t) => {
  const userEmail = `logintest_${Date.now()}@cineverse.test`;
  await request(app).post('/api/v1/auth/register').send({
    name: 'Login Test User',
    email: userEmail,
    password: 'UserPass@123',
  });

  await t.test('Customer can login via User Login mode', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userEmail,
      password: 'UserPass@123',
      loginMode: 'user',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'user');
  });

  await t.test('Customer attempting Admin Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userEmail,
      password: 'UserPass@123',
      loginMode: 'admin', // Trying admin login
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('administrator privileges'));
  });

  await t.test('Administrator can successfully login via Admin Login mode', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cineverse.com',
      password: 'Admin@CineVerse2026',
      loginMode: 'admin',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'admin');
    assert(res.body.data.token, 'Token must be returned');
  });

  await t.test('Admin login with invalid password is rejected with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cineverse.com',
      password: 'WrongPassword999!',
      loginMode: 'admin',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Invalid email or password credentials'));
  });

  await t.test('Admin login with non-existent account is rejected with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'missing_admin_account@cineverse.test',
      password: 'AnyPassword@123',
      loginMode: 'admin',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Invalid email or password credentials'));
  });

  await t.test('Admin attempting Customer Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cineverse.com',
      password: 'Admin@CineVerse2026',
      loginMode: 'user',
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Please select "Admin Login" mode'));
  });

  await t.test('Customer attempting Theatre Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userEmail,
      password: 'UserPass@123',
      loginMode: 'theatre',
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('theatre management privileges'));
  });

  await t.test('Theatre staff can successfully login via Theatre Login mode', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'theatre@cineverse.com',
      password: 'Theatre@CineVerse2026',
      loginMode: 'theatre',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'theatre');
    assert(res.body.data.token, 'Token must be returned');
  });

  await t.test('Theatre staff attempting Customer Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'theatre@cineverse.com',
      password: 'Theatre@CineVerse2026',
      loginMode: 'user',
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Please select "Theatre" mode to sign in'));
  });

  await t.test('Theatre staff attempting Admin Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'theatre@cineverse.com',
      password: 'Theatre@CineVerse2026',
      loginMode: 'admin',
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('administrator privileges'));
  });

  await t.test('Admin attempting Theatre Login mode is rejected with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cineverse.com',
      password: 'Admin@CineVerse2026',
      loginMode: 'theatre',
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Please select "Admin Login" mode'));
  });

  await t.test('Customer login with invalid password is rejected with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userEmail,
      password: 'WrongPassword999!',
      loginMode: 'user',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Invalid email or password credentials'));
  });

  await t.test('Customer login with non-existent account is rejected with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent_customer_999@cineverse.test',
      password: 'AnyPassword@123',
      loginMode: 'user',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Invalid email or password credentials'));
  });

  await t.test('Database connection failure returns 503 Service Unavailable', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cineverse.com',
      password: 'Admin@CineVerse2026',
      loginMode: 'admin',
    });

    if (originalDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalDescriptor);
    } else {
      delete mongoose.connection.readyState;
    }

    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Database service is temporarily unavailable'));
  });

  await t.test('Admin bootstrap ensures admin account exists idempotently without duplicates', async () => {
    const { ensureAdminExists } = require('../src/utils/bootstrapAdmin');
    const admin1 = await ensureAdminExists();
    const admin2 = await ensureAdminExists();
    assert(admin1);
    assert.strictEqual(admin1._id.toString(), admin2._id.toString());
    const count = await User.countDocuments({ email: 'admin@cineverse.com' });
    assert.strictEqual(count, 1);
  });
});

test('3. Role-Based Protected Routes', async (t) => {
  // Get normal user token
  const userRes = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@cineverse.com',
    password: 'Admin@CineVerse2026',
    loginMode: 'admin',
  });
  const adminToken = userRes.body.data.token;

  const normalUserEmail = `reg_${Date.now()}@cineverse.test`;
  const regRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Regular Joe',
    email: normalUserEmail,
    password: 'JoePassword@123',
  });
  const userToken = regRes.body.data.token;

  await t.test('Unauthenticated request to GET /api/v1/admin/analytics is rejected with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/admin/analytics');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Regular user cannot access admin dashboard endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Regular user cannot access admin analytics endpoint (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Admin user CAN access admin analytics endpoint with full metrics and aggregation', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;
    assert(data.overview, 'Overview object should be returned');
    assert(data.overview.totalBookings >= 0);
    assert(data.overview.totalMovies > 0);
    assert(data.overview.totalTheatres > 0);
    assert(data.overview.totalUsers > 0);
    assert(data.overview.totalShows >= 0);
    assert(typeof data.overview.demoRevenue === 'number');

    assert(Array.isArray(data.topMovies), 'topMovies should be an array');
    assert(Array.isArray(data.statusBreakdown), 'statusBreakdown should be an array');
    assert(Array.isArray(data.recentBookings), 'recentBookings should be an array');
    assert(Array.isArray(data.revenueByDay), 'revenueByDay should be an array');
    assert.strictEqual(data.revenueByDay.length, 7);
  });

  await t.test('Admin user CAN access admin dashboard endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.metrics);
  });

  await t.test('Theatre screens can be retrieved by theatreId', async () => {
    const theatre = await Theatre.findOne();
    assert(theatre);
    const res = await request(app).get(`/api/v1/screens/theatre/${theatre._id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
  });
});

test('4. Movies & Theatres Search & Date Showtimes', async (t) => {
  await t.test('Fetch movies with search filter', async () => {
    const res = await request(app).get('/api/v1/movies?search=Leo');
    assert.strictEqual(res.status, 200);
    assert(res.body.data.length > 0);
  });

  await t.test('Fetch nearby theatres by coordinates', async () => {
    // Chennai Express Avenue coordinates: [80.2612, 13.0583]
    const res = await request(app).get('/api/v1/theatres/nearby?lat=13.0583&lng=80.2612&radius=10');
    assert.strictEqual(res.status, 200);
    assert(res.body.data.theatres.length > 0);
    assert(res.body.data.theatres[0].distanceKm !== undefined);
  });

  await t.test('Fetch showtimes by date', async () => {
    const { getLocalDateString } = require('../src/utils/dateUtils');
    const targetDate = getLocalDateString(1);
    const res = await request(app).get(`/api/v1/shows?date=${targetDate}`);
    assert.strictEqual(res.status, 200);
    assert(res.body.data.shows.length > 0);
  });
});

test('5. Seat Locking, Socket Sync & Duplicate Prevention', async (t) => {
  const { getLocalDateString, isShowInPast } = require('../src/utils/dateUtils');
  const today = getLocalDateString(0);
  const scheduledShows = await Show.find({ status: 'scheduled', date: { $gte: today } }).sort({ date: 1 });
  const show = scheduledShows.find((s) => !isShowInPast(s.date, s.startTime));
  assert(show, 'Need an active upcoming scheduled show for test');

  // Clean any lingering test locks/bookings for isolation
  await SeatLock.deleteMany({});
  await Booking.deleteMany({ 'seats.seatNumber': { $in: ['C5', 'C6', 'D8'] } });

  // Register two distinct users
  const user1Email = `seat_u1_${Date.now()}@cineverse.test`;
  const user2Email = `seat_u2_${Date.now()}@cineverse.test`;

  const [u1, u2] = await Promise.all([
    request(app).post('/api/v1/auth/register').send({ name: 'User 1', email: user1Email, password: 'Pass@123' }),
    request(app).post('/api/v1/auth/register').send({ name: 'User 2', email: user2Email, password: 'Pass@123' }),
  ]);

  const token1 = u1.body.data.token;
  const token2 = u2.body.data.token;

  await t.test('User 1 locks seats C5 and C6 successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/seats/${show._id}/lock`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        seats: [
          { seatNumber: 'C5', rowLabel: 'C', category: 'Premium', price: 250 },
          { seatNumber: 'C6', rowLabel: 'C', category: 'Premium', price: 250 },
        ],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.lockedSeats.length, 2);
  });

  await t.test('User 2 attempting to lock seat C5 is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/v1/seats/${show._id}/lock`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        seats: [{ seatNumber: 'C5', rowLabel: 'C', category: 'Premium', price: 250 }],
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('temporarily selected by someone else'));
  });
});

test('6. Checkout, Demo Payment, QR Ticket & Verification Flow', async (t) => {
  const { getLocalDateString, isShowInPast } = require('../src/utils/dateUtils');
  const today = getLocalDateString(0);
  const scheduledShows = await Show.find({ status: 'scheduled', date: { $gte: today } }).sort({ date: 1 });
  const show = scheduledShows.find((s) => !isShowInPast(s.date, s.startTime));
  assert(show, 'Need an active upcoming scheduled show for checkout test');
  const userEmail = `checkout_${Date.now()}@cineverse.test`;
  const reg = await request(app).post('/api/v1/auth/register').send({
    name: 'Checkout Tester',
    email: userEmail,
    password: 'Pass@123',
  });
  const userToken = reg.body.data.token;

  await SeatLock.deleteMany({ seatNumber: 'D8' });
  await Booking.deleteMany({ 'seats.seatNumber': 'D8' });

  // 1. Lock seats
  await request(app)
    .post(`/api/v1/seats/${show._id}/lock`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      seats: [{ seatNumber: 'D8', rowLabel: 'D', category: 'Premium', price: 250 }],
    });

  // 2. Create Booking with Coupon 'CINEVERSE50'
  let bookingId;
  let bookingRef;
  await t.test('Create booking calculates server-side price & discount', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        showId: show._id,
        seatNumbers: ['D8'],
        couponCode: 'CINEVERSE50',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.bookingId);
    assert(res.body.data.bookingReference);
    assert.strictEqual(res.body.data.pricingDetails.couponCode, 'CINEVERSE50');

    bookingId = res.body.data.bookingId;
    bookingRef = res.body.data.bookingReference;
  });

  // 3. Process Demo Payment (simulate success)
  await t.test('Demo Payment successfully confirms booking', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${bookingId}/simulate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        method: 'upi',
        simulatedOutcome: 'success',
        upiVpa: 'user@okhdfcbank',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'confirmed');
    assert(res.body.data.demoTransactionRef.startsWith('DEMO-UPI-'));
  });

  // 4. Retrieve Digital Ticket
  let ticketToken;
  await t.test('Retrieve confirmed digital ticket', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${bookingRef}`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.bookingReference, bookingRef);
    assert.strictEqual(res.body.data.bookingStatus, 'confirmed');
    assert(res.body.data.ticketToken);
    ticketToken = res.body.data.ticketToken;
  });

  // 5. Theatre Gate Admission Ticket Verification
  const adminRes = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@cineverse.com',
    password: 'Admin@CineVerse2026',
    loginMode: 'admin',
  });
  const adminToken = adminRes.body.data.token;

  await t.test('Staff verifies valid ticket at gate', async () => {
    const res = await request(app)
      .post('/api/v1/tickets/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingReference: bookingRef,
        ticketToken,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'valid');
  });

  await t.test('Duplicate ticket scan is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/tickets/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingReference: bookingRef,
        ticketToken,
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.errors.status, 'already_admitted');
  });
});

test('8. Free Geocoding & Current Location Detection', async (t) => {
  await t.test('Reverse geocoding resolves coordinates to readable city and area without API key', async () => {
    const res = await request(app)
      .get('/api/v1/location/reverse?lat=13.0583&lng=80.2612');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.city, 'Chennai');
    assert(res.body.data.area || res.body.data.displayName);
    assert.strictEqual(typeof res.body.data.coordinates.lat, 'number');
    assert.strictEqual(typeof res.body.data.coordinates.lng, 'number');
  });

  await t.test('Reverse geocoding validates missing coordinates with 400 Bad Request', async () => {
    const res = await request(app).get('/api/v1/location/reverse');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Forward search geocoding finds location by area name (e.g. Koramangala)', async () => {
    const res = await request(app)
      .get('/api/v1/location/search?query=Koramangala');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length > 0);
    const match = res.body.data.find(d => d.name.toLowerCase().includes('koramangala') || d.city.toLowerCase().includes('bengaluru'));
    assert(match, 'Expected to find Koramangala or Bengaluru in search results');
  });

  await t.test('Forward search finds location by 6-digit PIN code (e.g. 600014)', async () => {
    const res = await request(app)
      .get('/api/v1/location/search?query=600014');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length > 0);
    assert.strictEqual(res.body.data[0].pinCode, '600014');
  });

  await t.test('Supported cinema cities endpoint returns city metadata with coordinates', async () => {
    const res = await request(app).get('/api/v1/location/cities');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    const chennai = res.body.data.find(c => c.name === 'Chennai');
    assert(chennai);
    assert.strictEqual(chennai.state, 'Tamil Nadu');
  });

  await t.test('Geocoded coordinates find nearby MongoDB theatres with real distances', async () => {
    const res = await request(app)
      .get('/api/v1/theatres/nearby?lat=13.0583&lng=80.2612&radius=10');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const theatres = res.body.data.theatres;
    assert(Array.isArray(theatres));
    assert(theatres.length > 0);
    assert(theatres[0].name.includes('Sathyam') || theatres[0].name.includes('CineVerse'));
    assert.strictEqual(theatres[0].distanceKm, 0);
  });
});


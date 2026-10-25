const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== STARTING COMPREHENSIVE ROLE-BASED PERMISSION TEST ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    } else {
      console.log(`✅ PASS: ${message}`);
      passed++;
    }
  }

  // 1. Customer Login
  console.log('--- Step 1: Customer Authentication ---');
  const customerLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'customer@cineverse.com', password: 'Customer@CineVerse2026', loginMode: 'user' }
  );
  assert(customerLogin.status === 200, 'Customer logged in successfully (HTTP 200)');
  assert(customerLogin.body?.data?.user?.role === 'user', 'Customer role is verified as "user"');
  const customerToken = customerLogin.body?.data?.token;

  // 2. Admin Login
  console.log('\n--- Step 2: Admin Authentication ---');
  const adminLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@cineverse.com', password: 'Admin@CineVerse2026', loginMode: 'admin' }
  );
  assert(adminLogin.status === 200, 'Admin logged in successfully (HTTP 200)');
  assert(adminLogin.body?.data?.user?.role === 'admin', 'Admin role is verified as "admin"');
  const adminToken = adminLogin.body?.data?.token;

  // 3. Customer CANNOT access Admin endpoints
  console.log('\n--- Step 3: Customer Restricted From Admin Endpoints ---');
  const custAdminDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custAdminDash.status === 403, 'Customer denied access to /api/v1/admin/dashboard (HTTP 403)');

  const custAdminStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/analytics',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custAdminStats.status === 403, 'Customer denied access to /api/v1/admin/stats (HTTP 403)');

  const custAdminUsers = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custAdminUsers.status === 403, 'Customer denied access to /api/v1/admin/users (HTTP 403)');

  // 4. Admin CAN access Admin endpoints
  console.log('\n--- Step 4: Admin Access to Admin Endpoints ---');
  const adminDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDash.status === 200, 'Admin successfully accessed /api/v1/admin/dashboard (HTTP 200)');

  const adminStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/analytics',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStats.status === 200, 'Admin successfully accessed /api/v1/admin/stats (HTTP 200)');

  // 5. Customer Booking Lifecycle (Browse, Lock Seat, Book, Simulate Payment, View Ticket)
  console.log('\n--- Step 5: Customer Full Booking Flow ---');
  const showsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/shows',
    method: 'GET',
  });
  assert(showsRes.status === 200, 'Shows fetched (HTTP 200)');
  const shows = showsRes.body?.data?.shows || [];
  assert(shows.length > 0, 'At least one show available');
  const show = shows[0];
  const showId = show._id;

  // Find an available seat
  const seatLayout = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/seats/${showId}/layout`,
    method: 'GET',
  });
  assert(seatLayout.status === 200, 'Seat layout loaded (HTTP 200)');
  const layout = seatLayout.body?.data?.layout || [];
  let availableSeat = null;
  for (const row of layout) {
    for (const s of (row.seats || [])) {
      if (s.status === 'available') {
        availableSeat = s;
        break;
      }
    }
    if (availableSeat) break;
  }
  assert(!!availableSeat, 'Found available seat: ' + (availableSeat?.seatNumber || 'none'));
  const testSeatNum = availableSeat.seatNumber;

  // Customer locks seat
  const custLock = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/seats/${showId}/lock`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    },
    {
      seats: [
        {
          seatNumber: testSeatNum,
          rowLabel: availableSeat.rowLabel,
          category: availableSeat.category,
          price: availableSeat.price,
        },
      ],
    }
  );
  assert(custLock.status === 200, `Customer successfully locked seat ${testSeatNum} (HTTP 200)`);

  // Customer creates booking
  const custBooking = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    },
    {
      showId,
      seatNumbers: [testSeatNum],
    }
  );
  assert(custBooking.status === 200 || custBooking.status === 201, 'Customer created booking (HTTP 200/201)');
  const bookingData = custBooking.body?.data || custBooking.body;
  const bookingId = bookingData.bookingId;
  const bookingRef = bookingData.bookingReference;

  // Customer views booking
  const custGetBooking = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/bookings/${bookingId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custGetBooking.status === 200, 'Customer retrieved own booking details (HTTP 200)');

  // Customer simulates payment
  const custPayment = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/payments/${bookingId}/simulate`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    },
    {
      method: 'upi',
      simulatedOutcome: 'success',
      upiVpa: 'customer@okhdfcbank',
    }
  );
  assert(custPayment.status === 200, 'Customer simulated demo payment (HTTP 200)');
  const paymentData = custPayment.body?.data || custPayment.body;
  assert(paymentData.status === 'confirmed', 'Payment outcome is confirmed');

  // Customer views ticket
  const custTicket = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/tickets/${bookingRef}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custTicket.status === 200, 'Customer retrieved confirmed digital QR ticket (HTTP 200)');

  // Customer views my-bookings
  const custMyBookings = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/bookings/my-bookings',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custMyBookings.status === 200, 'Customer retrieved booking history (HTTP 200)');
  const myBookingsList = custMyBookings.body?.data || custMyBookings.body;
  assert(Array.isArray(myBookingsList), 'Booking history returned as array');

  // 6. Admin Booking Rejection Verification (Must return HTTP 403 Forbidden with exact message)
  console.log('\n--- Step 6: Admin Forbidden From ALL Booking APIs ---');
  const expectedMsg = 'Admins are not allowed to book movie tickets. Please use a customer account.';

  // Attempt A: Admin POST /api/v1/bookings
  const adminPostBooking = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { showId, seatNumbers: ['A1'] }
  );
  assert(adminPostBooking.status === 403, 'Admin POST /api/v1/bookings rejected with HTTP 403');
  assert(adminPostBooking.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt B: Admin POST /api/v1/seats/:showId/lock
  const adminLockSeat = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/seats/${showId}/lock`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { seats: [{ seatNumber: 'A1', rowLabel: 'A', category: 'Standard', price: 250 }] }
  );
  assert(adminLockSeat.status === 403, 'Admin POST /api/v1/seats/:showId/lock rejected with HTTP 403');
  assert(adminLockSeat.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt C: Admin POST /api/v1/seats/:showId/release
  const adminReleaseSeat = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/seats/${showId}/release`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { seatNumbers: ['A1'] }
  );
  assert(adminReleaseSeat.status === 403, 'Admin POST /api/v1/seats/:showId/release rejected with HTTP 403');
  assert(adminReleaseSeat.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt D: Admin GET /api/v1/bookings/my-bookings
  const adminMyBookings = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/bookings/my-bookings',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminMyBookings.status === 403, 'Admin GET /api/v1/bookings/my-bookings rejected with HTTP 403');
  assert(adminMyBookings.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt E: Admin GET /api/v1/bookings/:bookingId
  const adminGetBooking = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/bookings/${bookingId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminGetBooking.status === 403, 'Admin GET /api/v1/bookings/:bookingId rejected with HTTP 403');
  assert(adminGetBooking.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt F: Admin POST /api/v1/payments/:bookingId/simulate
  const adminSimulatePayment = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/payments/${bookingId}/simulate`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { method: 'upi', simulatedOutcome: 'success' }
  );
  assert(adminSimulatePayment.status === 403, 'Admin POST /api/v1/payments/:id/simulate rejected with HTTP 403');
  assert(adminSimulatePayment.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt G: Admin GET /api/v1/tickets/:bookingReference
  const adminGetTicket = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/tickets/${bookingRef}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminGetTicket.status === 403, 'Admin GET /api/v1/tickets/:ref rejected with HTTP 403');
  assert(adminGetTicket.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt H: Admin POST /api/v1/groups
  const adminCreateGroup = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/groups',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { showId, totalSeatsNeeded: 3, title: 'Admin Group' }
  );
  assert(adminCreateGroup.status === 403, 'Admin POST /api/v1/groups rejected with HTTP 403');
  assert(adminCreateGroup.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt I: Admin GET /api/v1/users/rewards
  const adminRewards = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/users/rewards',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminRewards.status === 403, 'Admin GET /api/v1/users/rewards rejected with HTTP 403');
  assert(adminRewards.body.message === expectedMsg, `Exact message verified: "${expectedMsg}"`);

  // Attempt J: Frontend body spoofing attempt (e.g. sending role: 'user' in body while admin token is used)
  const spoofingAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { showId, seatNumbers: ['A2'], role: 'user', user: { role: 'user' } }
  );
  assert(spoofingAttempt.status === 403, 'Spoofing role in request body is ignored; rejected with HTTP 403');
  assert(spoofingAttempt.body.message === expectedMsg, `Verified rejection message for spoofing attempt`);

  console.log(`\n======================================================`);
  console.log(`🎉 ALL ${passed}/${total} ROLE-BASED PERMISSION TESTS PASSED!`);
  console.log(`======================================================`);
}

run().catch((err) => {
  console.error('Fatal error during permission tests:', err);
  process.exit(1);
});

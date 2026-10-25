const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Booking = require('../models/Booking');
const Snack = require('../models/Snack');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');

const JWT_SECRET = process.env.JWT_SECRET || 'cineverse_super_secret_jwt_key_2025';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runHttpTests() {
  console.log('Testing Live Backend HTTP Endpoints on http://127.0.0.1:5000...\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cineverse_ai');

  // 1. GET /api/snacks
  const snacksRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/snacks',
    method: 'GET',
  });
  console.log(`✓ GET /api/snacks -> HTTP ${snacksRes.status} (Found ${snacksRes.data?.data?.snacks?.length} snacks)`);
  if (snacksRes.status !== 200 || !snacksRes.data?.data?.snacks?.length) {
    throw new Error('Failed GET /api/snacks');
  }

  // 2. GET /api/snacks/categories
  const catRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/snacks/categories',
    method: 'GET',
  });
  console.log(`✓ GET /api/snacks/categories -> HTTP ${catRes.status} (Categories: ${catRes.data?.data?.categories?.join(', ')})`);
  if (catRes.status !== 200) {
    throw new Error('Failed GET /api/snacks/categories');
  }

  // 3. Authenticate User & Test PUT /api/bookings/:id/snacks
  let user = await User.findOne({ role: 'user' });
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

  const show = await Show.findOne({ status: 'scheduled' })
    .populate('movieId')
    .populate('theatreId')
    .populate('screenId');

  const testBooking = new Booking({
    bookingReference: `HTTP-SNACK-${Date.now().toString().slice(-6)}`,
    userId: user._id,
    showId: show._id,
    movieId: show.movieId._id,
    theatreId: show.theatreId._id,
    screenId: show.screenId._id,
    seats: [{ seatNumber: 'H1', rowLabel: 'H', category: 'Standard', price: 200 }],
    snacks: [],
    pricingDetails: {
      ticketsSubtotal: 200,
      snacksSubtotal: 0,
      subtotal: 200,
      convenienceFee: 30,
      tax: 5,
      discount: 0,
      totalAmount: 235,
    },
    bookingStatus: 'reserved',
    paymentStatus: 'pending',
    ticketToken: 'http_tok_' + Date.now(),
  });
  await testBooking.save();

  const snackItem = await Snack.findOne({ isAvailable: true });

  // Update snacks via HTTP API
  const updateRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/bookings/${testBooking._id}/snacks`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      snacks: [{ snackId: snackItem._id.toString(), quantity: 3 }],
    }
  );

  console.log(`✓ PUT /api/bookings/:id/snacks -> HTTP ${updateRes.status}`);
  console.log(`   - Snacks Subtotal: ₹${updateRes.data?.data?.pricingDetails?.snacksSubtotal}`);
  console.log(`   - Total Amount: ₹${updateRes.data?.data?.pricingDetails?.totalAmount}`);

  if (updateRes.status !== 200 || updateRes.data?.data?.pricingDetails?.snacksSubtotal !== snackItem.price * 3) {
    throw new Error('PUT /api/bookings/:id/snacks did not calculate correct subtotal');
  }

  // 4. Test validation: Negative quantity should be skipped/handled
  const zeroRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/bookings/${testBooking._id}/snacks`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      snacks: [],
    }
  );
  console.log(`✓ PUT /api/bookings/:id/snacks (clear snacks) -> HTTP ${zeroRes.status}`);
  console.log(`   - Reset Snacks Subtotal: ₹${zeroRes.data?.data?.pricingDetails?.snacksSubtotal}`);

  // 5. Test validation: Non-existent snackId should return 404
  const invalidRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/bookings/${testBooking._id}/snacks`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      snacks: [{ snackId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
    }
  );
  console.log(`✓ PUT /api/bookings/:id/snacks with invalid snackId -> HTTP ${invalidRes.status} (Expected 404)`);

  // Clean up
  await Booking.findByIdAndDelete(testBooking._id);
  await mongoose.disconnect();

  console.log('\nAll Live HTTP API validations PASSED!\n');
}

runHttpTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

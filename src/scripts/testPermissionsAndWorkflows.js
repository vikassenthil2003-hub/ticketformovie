const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { generateToken } = require('../utils/jwtHelper');
const User = require('../models/User');
const Show = require('../models/Show');
const Theatre = require('../models/Theatre');
const SeatLock = require('../models/SeatLock');

async function testPermissionsAndWorkflows() {
  console.log('\n======================================================');
  console.log('TESTING RBAC PERMISSIONS & THEATRE BOOKING WORKFLOWS');
  console.log('======================================================\n');

  const baseUrl = 'http://localhost:5000/api/v1';

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Find or create test admin user
    let admin = await User.findOne({ email: 'admin@cineverse.com' });
    if (!admin) {
      admin = await User.findOne({ role: 'admin' });
    }
    if (!admin) {
      throw new Error('No admin user found in database');
    }
    const adminToken = generateToken({ id: admin._id, role: 'admin' });

    // 2. Find or create test customer user
    let customer = await User.findOne({ role: 'user' });
    if (!customer) {
      throw new Error('No customer user found in database');
    }
    const customerToken = generateToken({ id: customer._id, role: 'user' });

    console.log(`[Setup] Admin user: "${admin.email}" (role: ${admin.role})`);
    console.log(`[Setup] Customer user: "${customer.email}" (role: ${customer.role})\n`);

    // TEST A: Customer attempts admin theatre import
    console.log('[Test A] Customer attempting admin-only POST /admin/theatres/import...');
    const custImportRes = await fetch(`${baseUrl}/admin/theatres/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ mode: 'curated' }),
    });
    console.log(`  Status: ${custImportRes.status} (Expected: 403)`);
    if (custImportRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for customer on admin route, got ${custImportRes.status}`);
    }
    console.log('  ✓ Customer correctly blocked from admin theatre import.\n');

    // TEST B: Admin executes duplicate scan
    console.log('[Test B] Admin scanning duplicate theatres via /admin/theatres/duplicates...');
    const adminDupRes = await fetch(`${baseUrl}/admin/theatres/duplicates`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const dupJson = await adminDupRes.json();
    console.log(`  Status: ${adminDupRes.status}, Clusters found: ${dupJson.data?.totalClusters || 0}`);
    if (adminDupRes.status !== 200) {
      throw new Error(`Failed to scan duplicates as admin: ${JSON.stringify(dupJson)}`);
    }
    console.log('  ✓ Admin duplicate scan executed successfully.\n');

    // TEST C: Admin attempts to book a movie ticket
    console.log('[Test C] Admin attempting to book movie ticket (POST /bookings)...');
    const { getLocalDateString } = require('../utils/dateUtils');
    const today = getLocalDateString(0);
    let aShow = await Show.findOne({ date: { $gte: today }, status: 'scheduled' });
    if (!aShow) {
      aShow = await Show.findOne({ status: 'scheduled' });
    }
    if (!aShow) {
      throw new Error('No scheduled show found to test booking restriction');
    }

    const adminBookingRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        showId: aShow._id.toString(),
        seatNumbers: ['A1'],
      }),
    });
    const adminBookingJson = await adminBookingRes.json();
    console.log(`  Status: ${adminBookingRes.status} (Expected: 403)`);
    console.log(`  Response message: "${adminBookingJson.message}"`);
    if (adminBookingRes.status !== 403) {
      throw new Error(`Admin booking was not rejected! Expected 403, got ${adminBookingRes.status}`);
    }
    if (!adminBookingJson.message?.includes('Admins are not allowed to book movie tickets')) {
      throw new Error(`Unexpected message: ${adminBookingJson.message}`);
    }
    console.log('  ✓ Admin booking strictly blocked with mandatory security notice.\n');

    // TEST D: Admin toggling verification on a theatre
    console.log('[Test D] Admin updating theatre verification status...');
    const aTheatre = await mongoose.model('Theatre').findOne({ district: 'Chennai' });
    const patchRes = await fetch(`${baseUrl}/admin/theatres/${aTheatre._id}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'verified',
        notes: 'Verified landmark multiplex in Chennai.',
      }),
    });
    const patchJson = await patchRes.json();
    console.log(`  Status: ${patchRes.status}, New status: ${patchJson.data?.verificationStatus}`);
    if (patchRes.status !== 200) {
      throw new Error(`Failed to update verification status as admin: ${JSON.stringify(patchJson)}`);
    }
    console.log('  ✓ Admin theatre verification update successful.\n');

    // TEST E: Verify dynamic date coverage (Today, Tomorrow, Future)
    console.log('[Test E] Verifying dynamic date showtimes across Tamil Nadu...');
    const dateToday = getLocalDateString(0);
    const dateTomorrow = getLocalDateString(1);

    const todayShowsCount = await Show.countDocuments({ date: dateToday });
    const tomorrowShowsCount = await Show.countDocuments({ date: dateTomorrow });
    console.log(`  Today (${dateToday}) live shows: ${todayShowsCount}`);
    console.log(`  Tomorrow (${dateTomorrow}) live shows: ${tomorrowShowsCount}`);
    if (todayShowsCount === 0) {
      console.warn('  Notice: 0 shows for today, consider seeding shows.');
    } else {
      console.log('  ✓ Dynamic date showtimes active and verified.\n');
    }

    console.log('======================================================');
    console.log('✓ ALL RBAC PERMISSION & WORKFLOW TESTS PASSED!');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Permissions Test Failed:', err);
    process.exit(1);
  }
}

testPermissionsAndWorkflows();

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { TAMIL_NADU_DISTRICTS } = require('../data/tamilNaduDistricts');
const Theatre = require('../models/Theatre');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const counts = await Theatre.aggregate([
    {
      $group: {
        _id: '$district',
        total: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] },
        },
        unverified: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'unverified'] }, 1, 0] },
        },
        inactive: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'inactive'] }, 1, 0] },
        },
      },
    },
  ]);

  const map = new Map(counts.map((c) => [(c._id || '').toLowerCase(), c]));
  let covered = 0;
  let incomplete = [];
  console.log('\n--- TAMIL NADU DISTRICT BREAKDOWN ---');
  for (const d of TAMIL_NADU_DISTRICTS) {
    const c = map.get(d.name.toLowerCase());
    const tot = c ? c.total : 0;
    const ver = c ? c.verified : 0;
    const unver = c ? c.unverified : 0;
    const inact = c ? c.inactive : 0;
    if (tot > 0) covered++;
    if (tot === 0) incomplete.push(d.name);
    console.log(
      `${d.name.padEnd(18)}: ${String(tot).padStart(3)} total | ${String(ver).padStart(3)} verified | ${String(unver).padStart(3)} unverified | ${String(inact).padStart(2)} inactive`
    );
  }

  console.log(`\nCovered Tamil Nadu Districts: ${covered} / ${TAMIL_NADU_DISTRICTS.length}`);
  if (incomplete.length > 0) {
    console.log('Districts without any records:', incomplete);
  } else {
    console.log('All 38 districts have at least 1 theatre record!');
  }

  const otherDists = counts.filter((c) => !TAMIL_NADU_DISTRICTS.some((d) => d.name.toLowerCase() === (c._id || '').toLowerCase()));
  if (otherDists.length > 0) {
    console.log('\nOther non-TN district records in database:', otherDists);
  }

  process.exit(0);
}

main().catch(console.error);

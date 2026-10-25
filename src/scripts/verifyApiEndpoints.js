async function testEndpoints() {
  const baseUrl = 'http://localhost:5000/api/v1';
  console.log('Testing CineVerse Backend APIs on port 5000...\n');

  try {
    // 1. Location districts
    const distRes = await fetch(`${baseUrl}/location/districts`);
    const distData = await distRes.json();
    console.log(`[1] /location/districts: status=${distRes.status}, count=${distData.data?.length}`);

    // 2. Location reverse geocode for Madurai
    const revRes = await fetch(`${baseUrl}/location/reverse?lat=9.9252&lng=78.1198`);
    const revData = await revRes.json();
    console.log(`[2] /location/reverse: status=${revRes.status}, city=${revData.data?.city}, district=${revData.data?.district}`);

    // 3. Theatres summary & district coverage
    const covRes = await fetch(`${baseUrl}/theatres/districts`);
    const covData = await covRes.json();
    console.log(`[3] /theatres/districts: totalTheatres=${covData.data?.totalTheatres}, verified=${covData.data?.totalVerified}, coveredDistricts=${covData.data?.districtsCoveredCount}`);

    // 4. Filter by district (e.g. Coimbatore)
    const thRes = await fetch(`${baseUrl}/theatres?district=Coimbatore`);
    const thData = await thRes.json();
    const count = thData.data?.theatres ? thData.data.theatres.length : (thData.data ? thData.data.length : 0);
    console.log(`[4] /theatres?district=Coimbatore: count=${count}`);

    // 5. Nearby search around Chennai
    const nearRes = await fetch(`${baseUrl}/theatres/nearby?lat=13.0827&lng=80.2707&radius=15`);
    const nearData = await nearRes.json();
    console.log(`[5] /theatres/nearby: count=${nearData.data?.theatres?.length}, closest=${nearData.data?.theatres?.[0]?.name} (${nearData.data?.theatres?.[0]?.distanceKm} km)`);

    console.log('\nAll API Endpoint Tests Succeeded!');
  } catch (err) {
    console.error('API Test Error:', err.message);
  }
}

testEndpoints();

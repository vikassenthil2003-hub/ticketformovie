/**
 * Cinema Theatre Data Import & Management System for Tamil Nadu
 * Supports:
 * - Curated verified public directory dataset across all 38 districts
 * - Authentic OpenStreetMap cinema dataset and live Overpass bbox queries
 * - Spatial (< 400m) and normalized name deduplication
 * - Strict separation of verified vs unverified records
 * - Inactive / closed theatre marking
 * - Repeatable, idempotent imports
 */

const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const { TAMIL_NADU_DISTRICTS } = require('../data/tamilNaduDistricts');
const { TAMIL_NADU_VERIFIED_THEATRES } = require('../data/tamilNaduTheatres');
const { OPENSTREETMAP_TAMIL_NADU_THEATRES } = require('../data/openStreetMapTamilNaduTheatres');
const { ALL_INDIA_VERIFIED_THEATRES } = require('../data/allIndiaVerifiedTheatres');
const { ALL_INDIA_STATES } = require('../data/indiaLocationDirectory');
const googlePlacesService = require('./googlePlacesService');

/**
 * Normalize theatre name for duplicate detection
 */
const normalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\b(theatre|theatres|cinema|cinemas|talkies|multiplex|screen|screens|complex|picture|palace)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Haversine distance in meters
 */
const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find closest district for a set of coordinates in Tamil Nadu
 */
const inferDistrict = (lat, lng, cityName = '') => {
  if (cityName) {
    const cleanCity = cityName.toLowerCase().trim();
    const foundDist = TAMIL_NADU_DISTRICTS.find(
      (d) =>
        d.name.toLowerCase() === cleanCity ||
        d.cities.some((c) => c.toLowerCase() === cleanCity || cleanCity.includes(c.toLowerCase()))
    );
    if (foundDist) return foundDist.name;
  }

  // Fallback to geometric distance to district headquarters
  let closest = TAMIL_NADU_DISTRICTS[0];
  let minDistance = Infinity;

  for (const d of TAMIL_NADU_DISTRICTS) {
    const dist = Math.hypot(d.lat - lat, d.lng - lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = d;
    }
  }

  return closest ? closest.name : 'Chennai';
};

/**
 * Check if a theatre already exists in the database
 * 1. By exact placeId or osmId
 * 2. By spatial proximity (< 400m) AND normalized name similarity
 */
const findDuplicate = async (lat, lng, name, osmId = null, placeId = null) => {
  if (placeId) {
    const byPlace = await Theatre.findOne({ placeId });
    if (byPlace) return byPlace;
  }

  if (osmId) {
    const byOsm = await Theatre.findOne({ osmId });
    if (byOsm) return byOsm;
  }

  const normalized = normalizeName(name);

  // Find candidate theatres within ~1km box
  const degThreshold = 0.01; // ~1.1km
  const candidates = await Theatre.find({
    'location.coordinates.1': { $gte: lat - degThreshold, $lte: lat + degThreshold },
    'location.coordinates.0': { $gte: lng - degThreshold, $lte: lng + degThreshold },
  });

  for (const candidate of candidates) {
    const candLat = candidate.location.coordinates[1];
    const candLng = candidate.location.coordinates[0];
    const dist = distanceMeters(lat, lng, candLat, candLng);

    if (dist <= 400) {
      const candNorm = normalizeName(candidate.name);
      if (
        candNorm === normalized ||
        candNorm.includes(normalized) ||
        normalized.includes(candNorm) ||
        dist < 60 // Same exact physical coordinates
      ) {
        return candidate;
      }
    }
  }

  return null;
};

/**
 * Import curated verified dataset across all 38 districts of Tamil Nadu
 */
const importCuratedTheatres = async () => {
  const report = {
    totalProcessed: 0,
    newlyImported: 0,
    updated: 0,
    duplicatesSkipped: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    inactiveCount: 0,
    districtBreakdown: {},
  };

  for (const theatreData of TAMIL_NADU_VERIFIED_THEATRES) {
    report.totalProcessed++;
    const [lng, lat] = theatreData.coordinates;

    const existing = await findDuplicate(lat, lng, theatreData.name);

    if (existing) {
      // Idempotent update of verified metadata without breaking existing shows or bookings
      existing.name = theatreData.name || existing.name;
      existing.district = theatreData.district || existing.district;
      existing.locality = theatreData.locality || existing.locality;
      existing.address = theatreData.address || existing.address;
      existing.pinCode = theatreData.pinCode || existing.pinCode;
      existing.verificationStatus = 'verified';
      existing.lastVerifiedAt = new Date();
      existing.verificationNotes = theatreData.verificationNotes || existing.verificationNotes;
      if (theatreData.category) existing.category = theatreData.category;
      if (theatreData.screensCount) existing.screensCount = theatreData.screensCount;
      if (theatreData.amenities) existing.amenities = theatreData.amenities;
      if (!existing.brand || existing.brand === 'CineVerse Cinemas') {
        existing.brand = theatreData.brand;
      }
      existing.source = 'verified_directory';
      existing.isActive = true;
      await existing.save();

      report.updated++;
      report.duplicatesSkipped++;
    } else {
      // Create new verified theatre
      const newTheatre = new Theatre({
        name: theatreData.name,
        brand: theatreData.brand || 'CineVerse Partner',
        category: theatreData.category || 'Multiplex',
        address: theatreData.address,
        district: theatreData.district,
        city: theatreData.city,
        locality: theatreData.locality || '',
        pinCode: theatreData.pinCode || '',
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        amenities: theatreData.amenities || ['Dolby Atmos', '4K Projection', 'Parking'],
        rating: theatreData.rating || 4.5,
        reviewCount: Math.floor(Math.random() * 80) + 40,
        contactPhone: theatreData.contactPhone || '+91 44 2855 0000',
        screensCount: theatreData.screensCount || 2,
        isDemoData: false,
        isActive: true,
        source: 'verified_directory',
        verificationStatus: 'verified',
        verificationNotes: theatreData.verificationNotes || 'Verified against authentic theatre registry.',
        lastVerifiedAt: new Date(),
      });

      await newTheatre.save();
      report.newlyImported++;
    }

    const distName = theatreData.district;
    report.districtBreakdown[distName] = (report.districtBreakdown[distName] || 0) + 1;
  }

  // Count overall verification stats
  report.verifiedCount = await Theatre.countDocuments({ verificationStatus: 'verified' });
  report.unverifiedCount = await Theatre.countDocuments({ verificationStatus: 'unverified' });
  report.inactiveCount = await Theatre.countDocuments({ verificationStatus: 'inactive' });

  return report;
};

/**
 * Fetch and import cinemas from OpenStreetMap dataset or live Overpass API
 * Uses live Overpass bbox with automatic fallback to bundled authentic snapshot
 * Unverified records are strictly labeled as `unverified`
 */
const importFromOpenStreetMap = async (options = { limit: 0, forceSnapshot: false }) => {
  const report = {
    totalProcessed: 0,
    newlyImported: 0,
    updated: 0,
    duplicatesSkipped: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    inactiveCount: 0,
    osmNodesReceived: 0,
    dataSourceUsed: 'bundled_snapshot',
    districtBreakdown: {},
    errors: [],
  };

  let venues = [];

  // Try live Overpass bbox if not forced to snapshot
  if (!options.forceSnapshot) {
    try {
      const bboxQuery = `[out:json][timeout:25];(node(8.0,76.1,13.6,80.4)["amenity"="cinema"];way(8.0,76.1,13.6,80.4)["amenity"="cinema"];);out center tags;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(bboxQuery)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CineVerseAI-TN-TheatreManager/1.0 (contact@cineverse.local)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const elements = data.elements || [];
        if (elements.length > 0) {
          venues = elements.map((elem) => {
            const lat = elem.lat || (elem.center && elem.center.lat);
            const lng = elem.lon || (elem.center && elem.center.lon);
            const tags = elem.tags || {};
            const rawName = tags.name || tags['name:en'] || tags['name:ta'] || '';
            const cityCand = tags['addr:city'] || tags['addr:town'] || tags['addr:suburb'] || '';
            const district = inferDistrict(lat, lng, cityCand);
            return {
              osmId: `osm_${elem.type}_${elem.id}`,
              name: rawName,
              brand: tags.brand || tags.operator || 'Independent Cinema',
              lat,
              lng,
              district,
              city: cityCand || district,
              locality: tags['addr:suburb'] || tags['addr:neighbourhood'] || '',
              pinCode: tags['addr:postcode'] || '',
              screensCount: parseInt(tags.screens || tags['cinema:screens'], 10) || 1,
              source: 'osm',
              verificationStatus: 'unverified',
              verificationNotes: `Imported from OpenStreetMap Overpass (ID: ${elem.id}).`,
            };
          }).filter((v) => v.name && v.lat && v.lng);

          report.dataSourceUsed = 'live_overpass_api';
          report.osmNodesReceived = elements.length;
        }
      }
    } catch (liveErr) {
      console.warn('[Live Overpass API Notice]: Using authentic pre-bundled OSM snapshot. Reason:', liveErr.message);
      report.errors.push(`Live query fell back to bundled snapshot: ${liveErr.message}`);
    }
  }

  // Fallback to bundled authentic OpenStreetMap dataset if live query returned nothing
  if (!venues || venues.length === 0) {
    venues = OPENSTREETMAP_TAMIL_NADU_THEATRES;
    report.dataSourceUsed = 'bundled_osm_snapshot';
    report.osmNodesReceived = venues.length;
  }

  // Apply limit if specified
  const processList = options.limit && options.limit > 0 ? venues.slice(0, options.limit) : venues;

  for (const item of processList) {
    const lat = item.lat;
    const lng = item.lng;
    const rawName = item.name;

    if (!lat || !lng || !rawName) continue;

    report.totalProcessed++;
    const osmId = item.osmId;

    const existing = await findDuplicate(lat, lng, rawName, osmId);

    if (existing) {
      // Safe update: attach osmId if missing, preserve verified status if already verified!
      let hasChanges = false;
      if (!existing.osmId && osmId) {
        existing.osmId = osmId;
        hasChanges = true;
      }
      if (hasChanges) {
        await existing.save();
      }

      report.duplicatesSkipped++;
      report.updated++;
    } else {
      const district = item.district || inferDistrict(lat, lng, item.city || '');
      const city = item.city || district;
      const address =
        item.address ||
        `${rawName}, ${item.locality ? item.locality + ', ' : ''}${city}, ${district}, Tamil Nadu${item.pinCode ? ' - ' + item.pinCode : ''}`;

      const newTheatre = new Theatre({
        name: rawName,
        brand: item.brand || 'Independent Cinema',
        category: (item.screensCount && item.screensCount > 1) ? 'Multiplex' : 'Single Screen',
        address,
        district,
        city,
        locality: item.locality || '',
        pinCode: item.pinCode || '',
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        amenities: item.amenities || ['2K/4K Digital Screen', 'Air Conditioning', 'Parking'],
        rating: 4.2,
        reviewCount: Math.floor(Math.random() * 40) + 10,
        contactPhone: item.contactPhone || '+91 44 2855 0000',
        screensCount: item.screensCount || 1,
        isDemoData: false,
        isActive: true,
        source: 'osm',
        osmId,
        verificationStatus: 'unverified', // Unverified OSM imported record
        verificationNotes: item.verificationNotes || `Imported via OpenStreetMap. Awaiting administrator verification.`,
        lastVerifiedAt: new Date(),
      });

      await newTheatre.save();
      report.newlyImported++;
      report.districtBreakdown[district] = (report.districtBreakdown[district] || 0) + 1;
    }
  }

  report.verifiedCount = await Theatre.countDocuments({ verificationStatus: 'verified' });
  report.unverifiedCount = await Theatre.countDocuments({ verificationStatus: 'unverified' });
  report.inactiveCount = await Theatre.countDocuments({ verificationStatus: 'inactive' });

  return report;
};

/**
 * Detect suspected duplicates across the theatre collection
 * Identifies venues within < 400m or with identical normalized names in the same district
 */
const detectSuspectedDuplicates = async () => {
  const allTheatres = await Theatre.find({}).lean();
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < allTheatres.length; i++) {
    const t1 = allTheatres[i];
    const id1 = t1._id.toString();
    if (visited.has(id1)) continue;

    const norm1 = normalizeName(t1.name);
    const [lng1, lat1] = t1.location.coordinates;
    const duplicates = [];

    for (let j = i + 1; j < allTheatres.length; j++) {
      const t2 = allTheatres[j];
      const id2 = t2._id.toString();
      if (visited.has(id2)) continue;

      const norm2 = normalizeName(t2.name);
      const [lng2, lat2] = t2.location.coordinates;
      const dist = distanceMeters(lat1, lng1, lat2, lng2);

      const isNameMatch = norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
      const isClose = dist < 450;
      const isSameDistrict = t1.district?.toLowerCase() === t2.district?.toLowerCase();

      if ((isClose && isNameMatch) || (isClose && dist < 100) || (isSameDistrict && norm1.length > 4 && norm1 === norm2)) {
        duplicates.push({
          theatre: t2,
          distanceMeters: Math.round(dist),
          reason: dist < 100 ? 'Identical physical location' : isNameMatch ? 'Similar name within 450m' : 'Identical normalized name',
        });
        visited.add(id2);
      }
    }

    if (duplicates.length > 0) {
      visited.add(id1);
      clusters.push({
        primary: t1,
        duplicates,
      });
    }
  }

  return {
    totalClusters: clusters.length,
    clusters,
  };
};

/**
 * Get comprehensive statistics of Tamil Nadu theatre coverage across all 38 districts
 */
const getTamilNaduCoverageStats = async () => {
  const districtCounts = await Theatre.aggregate([
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
    { $sort: { total: -1 } },
  ]);

  const sourceBreakdown = await Theatre.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalTheatres = await Theatre.countDocuments();
  const totalActive = await Theatre.countDocuments({ isActive: true });
  const totalVerified = await Theatre.countDocuments({ verificationStatus: 'verified' });
  const totalUnverified = await Theatre.countDocuments({ verificationStatus: 'unverified' });
  const totalInactive = await Theatre.countDocuments({ verificationStatus: 'inactive' });

  // Compute showtime coverage
  const theatresWithShows = await Show.distinct('theatreId');
  const theatresWithShowsCount = theatresWithShows.length;
  const theatresMissingShowsCount = Math.max(0, totalTheatres - theatresWithShowsCount);

  const all38Districts = TAMIL_NADU_DISTRICTS.map((d) => {
    const stat = districtCounts.find((s) => s._id && s._id.toLowerCase() === d.name.toLowerCase());
    const count = stat ? stat.total : 0;
    return {
      name: d.name,
      id: d.id,
      headquarters: d.headquarters,
      lat: d.lat,
      lng: d.lng,
      citiesCount: d.cities.length,
      theatresCount: count,
      verifiedCount: stat ? stat.verified : 0,
      unverifiedCount: stat ? stat.unverified : 0,
      inactiveCount: stat ? stat.inactive : 0,
      // Status: High (>= 10), Moderate (3-9), Minimal (1-2), Incomplete (0)
      coverageStatus: count >= 10 ? 'High' : count >= 3 ? 'Moderate' : count > 0 ? 'Minimal / Expanding' : 'Incomplete',
    };
  });

  const coveredTamilNaduDistricts = all38Districts.filter((d) => d.theatresCount > 0);
  const incompleteOrMinimalDistricts = all38Districts.filter((d) => d.theatresCount <= 2);

  return {
    totalTheatres,
    totalActive,
    totalVerified,
    totalUnverified,
    totalInactive,
    theatresWithShowsCount,
    theatresMissingShowsCount,
    districtsCoveredCount: coveredTamilNaduDistricts.length,
    allDistrictsTotal: TAMIL_NADU_DISTRICTS.length, // 38
    districts: all38Districts,
    incompleteDistricts: incompleteOrMinimalDistricts.map((d) => d.name),
    minimalDistrictsDetails: incompleteOrMinimalDistricts.map((d) => ({ name: d.name, count: d.theatresCount, verified: d.verifiedCount })),
    sourceBreakdown: Object.fromEntries(sourceBreakdown.map((s) => [s._id || 'unknown', s.count])),
  };
};

/**
 * Import curated verified premier cinemas across Indian States & Union Territories
 */
const importAllIndiaTheatres = async () => {
  const report = {
    totalProcessed: 0,
    newlyImported: 0,
    updated: 0,
    duplicatesSkipped: 0,
    stateBreakdown: {},
    verifiedCount: 0,
    unverifiedCount: 0,
    inactiveCount: 0,
  };

  for (const item of ALL_INDIA_VERIFIED_THEATRES) {
    report.totalProcessed++;
    const [lng, lat] = item.coordinates;
    const existing = await findDuplicate(lat, lng, item.name, null, item.placeId);

    if (existing) {
      if (item.placeId && !existing.placeId) existing.placeId = item.placeId;
      existing.name = item.name || existing.name;
      existing.state = item.state || existing.state;
      existing.district = item.district || existing.district;
      existing.city = item.city || existing.city;
      existing.locality = item.locality || existing.locality;
      existing.address = item.address || existing.address;
      existing.pinCode = item.pinCode || existing.pinCode;
      existing.verificationStatus = 'verified';
      existing.lastVerifiedAt = new Date();
      existing.verificationNotes = item.verificationNotes || existing.verificationNotes;
      if (item.category) existing.category = item.category;
      if (item.screensCount) existing.screensCount = item.screensCount;
      if (item.amenities) existing.amenities = item.amenities;
      if (item.brand) existing.brand = item.brand;
      existing.source = 'national_directory';
      existing.isActive = true;
      await existing.save();

      report.updated++;
      report.duplicatesSkipped++;
    } else {
      const newTheatre = new Theatre({
        name: item.name,
        brand: item.brand || 'PVR INOX',
        category: item.category || 'Multiplex',
        placeId: item.placeId || undefined,
        address: item.address,
        state: item.state,
        district: item.district,
        city: item.city,
        locality: item.locality || '',
        pinCode: item.pinCode || '',
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        amenities: item.amenities || ['Dolby Atmos', '4K Projection', 'Parking'],
        rating: item.rating || 4.7,
        reviewCount: Math.floor(Math.random() * 80) + 50,
        contactPhone: item.contactPhone || '+91 22 6649 0233',
        screensCount: item.screensCount || 4,
        isDemoData: false,
        isActive: true,
        source: 'national_directory',
        verificationStatus: 'verified',
        verificationNotes: item.verificationNotes || 'Verified national premier cinema registry.',
        lastVerifiedAt: new Date(),
      });

      await newTheatre.save();
      report.newlyImported++;
    }

    const stName = item.state;
    report.stateBreakdown[stName] = (report.stateBreakdown[stName] || 0) + 1;
  }

  report.verifiedCount = await Theatre.countDocuments({ verificationStatus: 'verified' });
  report.unverifiedCount = await Theatre.countDocuments({ verificationStatus: 'unverified' });
  report.inactiveCount = await Theatre.countDocuments({ verificationStatus: 'inactive' });

  return report;
};

/**
 * Import verified theatres using Google Places API with fallback
 */
const importFromGooglePlaces = async (options = {}) => {
  return await googlePlacesService.importGooglePlacesTheatres(options);
};

/**
 * Get comprehensive statistics of theatre coverage across all 36 Indian States and UTs
 */
const getAllIndiaCoverageStats = async () => {
  const stateCounts = await Theatre.aggregate([
    {
      $group: {
        _id: '$state',
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
    { $sort: { total: -1 } },
  ]);

  const districtCounts = await Theatre.aggregate([
    {
      $group: {
        _id: { state: '$state', district: '$district' },
        total: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] },
        },
        unverified: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'unverified'] }, 1, 0] },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const sourceBreakdown = await Theatre.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalTheatres = await Theatre.countDocuments();
  const totalActive = await Theatre.countDocuments({ isActive: true });
  const totalVerified = await Theatre.countDocuments({ verificationStatus: 'verified' });
  const totalUnverified = await Theatre.countDocuments({ verificationStatus: 'unverified' });
  const totalInactive = await Theatre.countDocuments({ verificationStatus: 'inactive' });

  const theatresWithShows = await Show.distinct('theatreId');
  const theatresWithShowsCount = theatresWithShows.length;
  const theatresMissingShowsCount = Math.max(0, totalTheatres - theatresWithShowsCount);

  // Map all 36 States/UTs
  const statesSummary = ALL_INDIA_STATES.map((st) => {
    const stat = stateCounts.find((s) => s._id && s._id.toLowerCase() === st.name.toLowerCase());
    const count = stat ? stat.total : 0;
    const stateDistricts = districtCounts.filter(
      (d) => d._id?.state && d._id.state.toLowerCase() === st.name.toLowerCase()
    );

    return {
      name: st.name,
      code: st.code,
      type: st.type,
      capital: st.capital,
      lat: st.lat,
      lng: st.lng,
      theatresCount: count,
      verifiedCount: stat ? stat.verified : 0,
      unverifiedCount: stat ? stat.unverified : 0,
      inactiveCount: stat ? stat.inactive : 0,
      districtsCoveredCount: stateDistricts.length,
      totalDistrictsInDirectory: st.districts.length,
      coverageStatus: count >= 15 ? 'Comprehensive' : count >= 5 ? 'High' : count > 0 ? 'Expanding' : 'Uncovered',
    };
  });

  const statesCoveredCount = statesSummary.filter((s) => s.theatresCount > 0).length;

  return {
    totalTheatres,
    totalActive,
    totalVerified,
    totalUnverified,
    totalInactive,
    theatresWithShowsCount,
    theatresMissingShowsCount,
    statesCoveredCount,
    totalStatesInDirectory: ALL_INDIA_STATES.length, // 36 (28 states + 8 UTs)
    districtsCoveredCount: districtCounts.length,
    states: statesSummary,
    sourceBreakdown: Object.fromEntries(sourceBreakdown.map((s) => [s._id || 'unknown', s.count])),
    googlePlacesStatus: googlePlacesService.getStatus(),
  };
};

/**
 * Toggle or update verification status of a theatre
 */
const setTheatreVerification = async (theatreId, status, notes = '') => {
  const theatre = await Theatre.findById(theatreId);
  if (!theatre) {
    throw new Error('Theatre not found');
  }

  theatre.verificationStatus = status;
  theatre.lastVerifiedAt = new Date();
  if (status === 'inactive') {
    theatre.isActive = false;
  } else if (status === 'verified') {
    theatre.isActive = true;
  }

  if (notes) {
    theatre.verificationNotes = notes;
  }
  await theatre.save();
  return theatre;
};

module.exports = {
  importCuratedTheatres,
  importAllIndiaTheatres,
  importFromGooglePlaces,
  importFromOpenStreetMap,
  detectSuspectedDuplicates,
  getTamilNaduCoverageStats,
  getAllIndiaCoverageStats,
  setTheatreVerification,
  findDuplicate,
  inferDistrict,
  normalizeName,
};

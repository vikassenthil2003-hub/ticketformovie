/**
 * Free Geocoding Service using OpenStreetMap Nominatim
 * Adheres strictly to OSM Nominatim Acceptable Use Policy:
 * 1. Customized identifying User-Agent
 * 2. Request throttling: maximum 1 request per second
 * 3. In-memory caching with TTL to prevent redundant requests
 * 4. Zero paid API keys required
 * 5. Robust offline local fallback for cinema hubs and PIN codes
 */

// In-memory cache with 24-hour TTL
const geocodeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Rate limiting: at least 1100ms between calls to OSM Nominatim
let lastOsmRequestTime = 0;
const OSM_MIN_INTERVAL_MS = 1100;

// Curated verified cinema hubs, areas, and PIN codes for instant fallback
const LOCAL_CINEMA_LOCATIONS = [
  // Chennai Hubs
  { name: 'Royapettah', area: 'Royapettah', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600014', lat: 13.0583, lng: 80.2612 },
  { name: 'Vadapalani', area: 'Vadapalani', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600026', lat: 13.0515, lng: 80.2098 },
  { name: 'Velachery', area: 'Velachery', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600042', lat: 12.9815, lng: 80.2180 },
  { name: 'Anna Nagar', area: 'Anna Nagar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600040', lat: 13.0850, lng: 80.2101 },
  { name: 'T. Nagar', area: 'T. Nagar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600017', lat: 13.0418, lng: 80.2341 },
  { name: 'Adyar', area: 'Adyar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600020', lat: 13.0012, lng: 80.2565 },
  { name: 'Chennai Central', area: 'Park Town', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pinCode: '600003', lat: 13.0827, lng: 80.2707 },
  
  // Mumbai & Thane Hubs
  { name: 'Andheri West (Infiniti)', area: 'Andheri West', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', pinCode: '400053', lat: 19.1411, lng: 72.8310 },
  { name: 'Malad West (Inorbit)', area: 'Malad West', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', pinCode: '400064', lat: 19.1729, lng: 72.8361 },
  { name: 'Viviana Mall', area: 'Thane West', city: 'Thane', district: 'Thane', state: 'Maharashtra', pinCode: '400606', lat: 19.2087, lng: 72.9715 },
  { name: 'Kurla West (Marketcity)', area: 'Kurla West', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', pinCode: '400070', lat: 19.0867, lng: 72.8889 },

  // Bengaluru Hubs
  { name: 'Koramangala (Forum)', area: 'Koramangala', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pinCode: '560034', lat: 12.9352, lng: 77.6271 },
  { name: 'Indiranagar', area: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pinCode: '560038', lat: 12.9784, lng: 77.6408 },
  { name: 'Whitefield', area: 'Whitefield', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pinCode: '560066', lat: 12.9698, lng: 77.7500 },
  { name: 'Rajajinagar (Orion)', area: 'Rajajinagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pinCode: '560055', lat: 13.0112, lng: 77.5550 },

  // Delhi NCR Hubs
  { name: 'Connaught Place (CP)', area: 'Connaught Place', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', pinCode: '110001', lat: 28.6331, lng: 77.2195 },
  { name: 'Saket (Select Citywalk)', area: 'Saket', city: 'New Delhi', district: 'South Delhi', state: 'Delhi', pinCode: '110017', lat: 28.5284, lng: 77.2194 },
  { name: 'Noida Sector 18 / 32', area: 'Sector 32', city: 'Noida', district: 'Gautam Buddha Nagar (Noida)', state: 'Uttar Pradesh', pinCode: '201301', lat: 28.5746, lng: 77.3541 },

  // Hyderabad Hubs
  { name: 'Hitec City / Madhapur', area: 'Madhapur', city: 'Hyderabad', district: 'Ranga Reddy', state: 'Telangana', pinCode: '500081', lat: 17.4346, lng: 78.3868 },
  { name: 'Necklace Road (Prasads)', area: 'Necklace Road', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pinCode: '500063', lat: 17.4123, lng: 78.4674 },
  { name: 'Kondapur (AMB)', area: 'Kondapur', city: 'Hyderabad', district: 'Ranga Reddy', state: 'Telangana', pinCode: '500084', lat: 17.4642, lng: 78.3615 },

  // Kerala Hubs
  { name: 'Edappally (Lulu Mall)', area: 'Edappally', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pinCode: '682024', lat: 10.0281, lng: 76.3079 },
  { name: 'Thampanoor (Aries Plex)', area: 'Thampanoor', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pinCode: '695001', lat: 8.4891, lng: 76.9535 },

  // Coimbatore Hubs
  { name: 'Saravanampatti (Prozone)', area: 'Saravanampatti', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pinCode: '641035', lat: 11.0545, lng: 76.9942 },
  { name: 'Gandhipuram', area: 'Gandhipuram', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pinCode: '641012', lat: 11.0183, lng: 76.9654 },

  // Kolkata Hubs
  { name: 'Park Circus (Quest Mall)', area: 'Park Circus', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', pinCode: '700017', lat: 22.5392, lng: 88.3653 },

  // Pune Hubs
  { name: 'Viman Nagar (Marketcity)', area: 'Viman Nagar', city: 'Pune', district: 'Pune', state: 'Maharashtra', pinCode: '411014', lat: 18.5622, lng: 73.9167 },

  // Ahmedabad Hubs
  { name: 'Vastrapur (Ahmedabad One)', area: 'Vastrapur', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pinCode: '380054', lat: 23.0396, lng: 72.5310 },

  // Jaipur Hubs
  { name: 'C Scheme (Raj Mandir)', area: 'C Scheme', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', pinCode: '302001', lat: 26.9163, lng: 75.8118 },

  // Chandigarh Hub
  { name: 'Industrial Area (Elante Mall)', area: 'Industrial Area', city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', pinCode: '160002', lat: 30.7055, lng: 76.8013 },
];

/**
 * Throttle requests to respect OSM 1 request/sec policy
 */
const throttleOsmRequest = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastOsmRequestTime;
  if (timeSinceLast < OSM_MIN_INTERVAL_MS) {
    const waitTime = OSM_MIN_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastOsmRequestTime = Date.now();
};

/**
 * Find closest known local cinema hub based on Euclidean distance
 */
const findClosestLocalHub = (lat, lng) => {
  let closest = LOCAL_CINEMA_LOCATIONS[0];
  let minDistance = Infinity;

  for (const loc of LOCAL_CINEMA_LOCATIONS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  return closest;
};

const { TAMIL_NADU_DISTRICTS } = require('../data/tamilNaduDistricts');
const { findStateAndDistrictByCoords, searchIndiaLocations } = require('../data/indiaLocationDirectory');

/**
 * Infer District and State from lat/lng or city name
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

  // Use nationwide coordinate inference
  const geoResult = findStateAndDistrictByCoords(lat, lng);
  return geoResult.district || 'Chennai';
};

/**
 * Search local locations by text query or PIN code
 * Searches cinema hubs, all 38 districts, and all 36 Indian States/UTs and towns
 */
const searchLocalLocations = (query) => {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  const isPin = /^\d{3,6}$/.test(q);

  const matched = [];

  // Match from curated cinema locations
  LOCAL_CINEMA_LOCATIONS.forEach((loc) => {
    if (isPin) {
      if (loc.pinCode.startsWith(q)) matched.push(loc);
    } else if (
      loc.name.toLowerCase().includes(q) ||
      loc.area.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q) ||
      loc.pinCode.includes(q)
    ) {
      matched.push(loc);
    }
  });

  // Match from all-India directory (all 36 States/UTs, districts, and towns)
  if (!isPin) {
    const nationalMatches = searchIndiaLocations(q);
    nationalMatches.forEach((nm) => {
      if (!matched.some((m) => m.name.toLowerCase() === nm.name.toLowerCase())) {
        matched.push({
          name: nm.name,
          area: nm.city,
          city: nm.city,
          district: nm.district,
          state: nm.state,
          pinCode: '',
          lat: nm.lat,
          lng: nm.lng,
          displayName: nm.displayName,
        });
      }
    });
  }

  return matched;
};

/**
 * Reverse Geocode coordinates to city, area, and PIN code using OpenStreetMap Nominatim
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>}
 */
const reverseGeocode = async (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Valid latitude and longitude are required');
  }

  // Rounded coordinates (4 decimals ~ 11 meters) for cache key
  const cacheKey = `rev_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    await throttleOsmRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'CineVerseAI/1.0 (https://cineverse.local; contact@cineverse.local)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim reverse error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.state_district ||
      addr.county ||
      'Chennai';

    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.quarter ||
      addr.city_district ||
      addr.road ||
      '';

    const geo = findStateAndDistrictByCoords(lat, lng);
    const state = addr.state || geo.state || 'Tamil Nadu';
    const district = addr.state_district || addr.county || inferDistrict(lat, lng, city) || geo.district;
    const pinCode = addr.postcode || '';
    const displayName = data.display_name || `${area ? area + ', ' : ''}${city}, ${district} District, ${state}`;

    const result = {
      city,
      district,
      area,
      state,
      pinCode,
      displayName,
      coordinates: { lat, lng },
      source: 'openstreetmap',
    };

    geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn(`[Geocoding Notice] OSM reverse-geocode unavailable (${err.message}). Using local coordinate resolution.`);
    const fallback = findClosestLocalHub(lat, lng);
    const geo = findStateAndDistrictByCoords(lat, lng);
    const result = {
      city: fallback.city || geo.city,
      district: fallback.district || geo.district,
      area: fallback.area,
      state: fallback.state || geo.state,
      pinCode: fallback.pinCode,
      displayName: `${fallback.area}, ${fallback.city}, ${fallback.district || geo.district} District, ${fallback.state || geo.state} — ${fallback.pinCode}`,
      coordinates: { lat, lng },
      source: 'local_fallback',
    };

    geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }
};

/**
 * Forward search for City, Area, or PIN code
 * @param {string} query
 * @returns {Promise<Array>}
 */
const searchLocations = async (query) => {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = `search_${cleanQuery.toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Pre-check local match for instant response
  const localMatches = searchLocalLocations(cleanQuery);

  try {
    await throttleOsmRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const isPin = /^\d{6}$/.test(cleanQuery);
    const searchParam = isPin
      ? `postalcode=${encodeURIComponent(cleanQuery)}&country=India`
      : `q=${encodeURIComponent(cleanQuery)}&countrycodes=in`;

    const url = `https://nominatim.openstreetmap.org/search?${searchParam}&format=jsonv2&addressdetails=1&limit=5`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'CineVerseAI/1.0 (https://cineverse.local; contact@cineverse.local)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim search error: ${response.status}`);
    }

    const data = await response.json();

    const remoteResults = (Array.isArray(data) ? data : []).map((item) => {
      const addr = item.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.state_district ||
        addr.county ||
        cleanQuery;

      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        item.name ||
        '';

      return {
        name: item.name || area || city,
        area,
        city,
        state: addr.state || 'India',
        pinCode: addr.postcode || '',
        displayName: item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
        source: 'openstreetmap',
      };
    });

    // Merge remote results with local matches, avoiding duplicates
    const combined = [...localMatches];
    remoteResults.forEach((remote) => {
      const exists = combined.some(
        (c) => Math.hypot(c.lat - remote.coordinates.lat, c.lng - remote.coordinates.lng) < 0.01
      );
      if (!exists) {
        combined.push({
          name: remote.name,
          area: remote.area,
          city: remote.city,
          state: remote.state,
          pinCode: remote.pinCode,
          lat: remote.coordinates.lat,
          lng: remote.coordinates.lng,
          displayName: remote.displayName,
          source: remote.source,
        });
      }
    });

    const finalResults = combined.slice(0, 8);
    geocodeCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
    return finalResults;
  } catch (err) {
    console.warn(`[Geocoding Notice] OSM search unavailable (${err.message}). Using local lookup results.`);
    geocodeCache.set(cacheKey, { data: localMatches, timestamp: Date.now() });
    return localMatches;
  }
};

module.exports = {
  reverseGeocode,
  searchLocations,
  LOCAL_CINEMA_LOCATIONS,
};

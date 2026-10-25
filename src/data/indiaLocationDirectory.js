/**
 * Comprehensive All-India Location Directory
 * Structured Hierarchy:
 * Country: India
 *   └── State / Union Territory (28 States + 8 UTs = 36 total)
 *       └── District
 *           └── City / Town / Municipality
 *               └── Locality / Area
 */

const { TAMIL_NADU_DISTRICTS } = require('./tamilNaduDistricts');

const ALL_INDIA_STATES = [
  // 1. Tamil Nadu (Complete 38 Districts)
  {
    code: 'TN',
    name: 'Tamil Nadu',
    type: 'State',
    capital: 'Chennai',
    lat: 13.0827,
    lng: 80.2707,
    isPopular: true,
    districts: TAMIL_NADU_DISTRICTS,
  },

  // 2. Maharashtra
  {
    code: 'MH',
    name: 'Maharashtra',
    type: 'State',
    capital: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    isPopular: true,
    districts: [
      {
        id: 'mumbai',
        name: 'Mumbai',
        headquarters: 'Mumbai',
        lat: 19.0760,
        lng: 72.8777,
        isPopular: true,
        cities: ['Andheri', 'Bandra', 'Borivali', 'Juhu', 'Colaba', 'Dadar', 'Kurla', 'Ghatkopar', 'Malad', 'Goregaon', 'Powai', 'Worli'],
      },
      {
        id: 'mumbai_suburban',
        name: 'Mumbai Suburban',
        headquarters: 'Bandra',
        lat: 19.1363,
        lng: 72.8277,
        isPopular: true,
        cities: ['Bandra West', 'Andheri West', 'Kandivali', 'Vile Parle', 'Santacruz', 'Mulund'],
      },
      {
        id: 'thane',
        name: 'Thane',
        headquarters: 'Thane',
        lat: 19.2183,
        lng: 72.9781,
        isPopular: true,
        cities: ['Thane West', 'Kalyan', 'Dombivli', 'Mira-Bhayandar', 'Ulhasnagar', 'Bhiwandi', 'Navi Mumbai (Thane)'],
      },
      {
        id: 'pune',
        name: 'Pune',
        headquarters: 'Pune',
        lat: 18.5204,
        lng: 73.8567,
        isPopular: true,
        cities: ['Pune City', 'Kothrud', 'Viman Nagar', 'Hadapsar', 'Aundh', 'Hinjewadi', 'Shivajinagar', 'Pimpri-Chinchwad', 'Baner', 'Wakad'],
      },
      {
        id: 'nagpur',
        name: 'Nagpur',
        headquarters: 'Nagpur',
        lat: 21.1458,
        lng: 79.0882,
        isPopular: true,
        cities: ['Nagpur City', 'Dharampeth', 'Sitabuldi', 'Civil Lines', 'Sadar', 'Wardhamannagar'],
      },
      {
        id: 'nashik',
        name: 'Nashik',
        headquarters: 'Nashik',
        lat: 19.9975,
        lng: 73.7898,
        isPopular: false,
        cities: ['Nashik City', 'College Road', 'Panchavati', 'Satpur', 'Deolali', 'Shalimar'],
      },
      {
        id: 'aurangabad',
        name: 'Chhatrapati Sambhajinagar',
        headquarters: 'Chhatrapati Sambhajinagar',
        lat: 19.8762,
        lng: 75.3433,
        isPopular: false,
        cities: ['Chhatrapati Sambhajinagar City', 'Cidco', 'Garkheda', 'Kranti Chowk'],
      },
      {
        id: 'kolhapur',
        name: 'Kolhapur',
        headquarters: 'Kolhapur',
        lat: 16.7050,
        lng: 74.2433,
        isPopular: false,
        cities: ['Kolhapur City', 'Rajarampuri', 'Shahupuri', 'Ichalkaranji'],
      },
    ],
  },

  // 3. Karnataka
  {
    code: 'KA',
    name: 'Karnataka',
    type: 'State',
    capital: 'Bengaluru',
    lat: 12.9716,
    lng: 77.5946,
    isPopular: true,
    districts: [
      {
        id: 'bengaluru_urban',
        name: 'Bengaluru Urban',
        headquarters: 'Bengaluru',
        lat: 12.9716,
        lng: 77.5946,
        isPopular: true,
        cities: ['Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'Rajajinagar', 'Malleshwaram', 'BTM Layout', 'HSR Layout', 'Electronic City', 'Hebbal', 'Yelahanka'],
      },
      {
        id: 'mysuru',
        name: 'Mysuru',
        headquarters: 'Mysuru',
        lat: 12.2958,
        lng: 76.6394,
        isPopular: true,
        cities: ['Mysuru City', 'Jayalakshmipuram', 'Gokulam', 'Vijayanagar', 'KRS Road', 'Saraswathipuram'],
      },
      {
        id: 'dakshina_kannada',
        name: 'Dakshina Kannada',
        headquarters: 'Mangaluru',
        lat: 12.9141,
        lng: 74.8560,
        isPopular: true,
        cities: ['Mangaluru City', 'Pandeshwar', 'Kodialbail', 'Kadri', 'Surathkal', 'Bantwal'],
      },
      {
        id: 'dharwad',
        name: 'Dharwad',
        headquarters: 'Hubballi-Dharwad',
        lat: 15.3647,
        lng: 75.1240,
        isPopular: false,
        cities: ['Hubballi', 'Dharwad City', 'Gokul Road', 'Vidyanagar'],
      },
      {
        id: 'belagavi',
        name: 'Belagavi',
        headquarters: 'Belagavi',
        lat: 15.8497,
        lng: 74.4977,
        isPopular: false,
        cities: ['Belagavi City', 'Tilakwadi', 'Camp', 'Udyambag'],
      },
    ],
  },

  // 4. Telangana
  {
    code: 'TS',
    name: 'Telangana',
    type: 'State',
    capital: 'Hyderabad',
    lat: 17.3850,
    lng: 78.4867,
    isPopular: true,
    districts: [
      {
        id: 'hyderabad',
        name: 'Hyderabad',
        headquarters: 'Hyderabad',
        lat: 17.3850,
        lng: 78.4867,
        isPopular: true,
        cities: ['Banjara Hills', 'Jubilee Hills', 'Abids', 'Charminar', 'Somajiguda', 'Ameerpet', 'Begumpet', 'Secunderabad'],
      },
      {
        id: 'ranga_reddy',
        name: 'Ranga Reddy',
        headquarters: 'Shamshabad',
        lat: 17.4399,
        lng: 78.3846,
        isPopular: true,
        cities: ['Hitec City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Manikonda', 'Shamshabad'],
      },
      {
        id: 'medchal_malkajgiri',
        name: 'Medchal-Malkajgiri',
        headquarters: 'Malkajgiri',
        lat: 17.4912,
        lng: 78.3918,
        isPopular: true,
        cities: ['Kukatpally', 'Miyapur', 'ECIL', 'Kompally', 'Malkajgiri', 'Alwal'],
      },
      {
        id: 'warangal',
        name: 'Warangal',
        headquarters: 'Warangal',
        lat: 17.9689,
        lng: 79.5941,
        isPopular: false,
        cities: ['Warangal City', 'Hanamkonda', 'Kazipet', 'Subedari'],
      },
      {
        id: 'nizamabad',
        name: 'Nizamabad',
        headquarters: 'Nizamabad',
        lat: 18.6725,
        lng: 78.0941,
        isPopular: false,
        cities: ['Nizamabad City', 'Bodhan', 'Armoor'],
      },
    ],
  },

  // 5. Delhi (NCT)
  {
    code: 'DL',
    name: 'Delhi',
    type: 'Union Territory',
    capital: 'New Delhi',
    lat: 28.6139,
    lng: 77.2090,
    isPopular: true,
    districts: [
      {
        id: 'new_delhi',
        name: 'New Delhi',
        headquarters: 'Connaught Place',
        lat: 28.6331,
        lng: 77.2195,
        isPopular: true,
        cities: ['Connaught Place', 'Chanakyapuri', 'Barakhamba Road', 'Delhi Gate', 'Gole Market'],
      },
      {
        id: 'south_delhi',
        name: 'South Delhi',
        headquarters: 'Saket',
        lat: 28.5284,
        lng: 77.2194,
        isPopular: true,
        cities: ['Saket', 'Hauz Khas', 'Vasant Kunj', 'Greater Kailash', 'Lajpat Nagar', 'Malviya Nagar'],
      },
      {
        id: 'south_east_delhi',
        name: 'South East Delhi',
        headquarters: 'Nehru Place',
        lat: 28.5494,
        lng: 77.2528,
        isPopular: true,
        cities: ['Nehru Place', 'Defence Colony', 'Okhla', 'Kalkaji', 'Jasola'],
      },
      {
        id: 'north_delhi',
        name: 'North Delhi',
        headquarters: 'Civil Lines',
        lat: 28.6820,
        lng: 77.2100,
        isPopular: false,
        cities: ['Civil Lines', 'Model Town', 'Kamla Nagar', 'Kashmere Gate'],
      },
      {
        id: 'west_delhi',
        name: 'West Delhi',
        headquarters: 'Rajouri Garden',
        lat: 28.6415,
        lng: 77.1209,
        isPopular: true,
        cities: ['Rajouri Garden', 'Janakpuri', 'Punjabi Bagh', 'Patel Nagar', 'Tilak Nagar'],
      },
    ],
  },

  // 6. Kerala
  {
    code: 'KL',
    name: 'Kerala',
    type: 'State',
    capital: 'Thiruvananthapuram',
    lat: 8.5241,
    lng: 76.9366,
    isPopular: true,
    districts: [
      {
        id: 'ernakulam',
        name: 'Ernakulam',
        headquarters: 'Kochi',
        lat: 9.9816,
        lng: 76.2999,
        isPopular: true,
        cities: ['Kochi City', 'Edappally', 'MG Road', 'Marine Drive', 'Kakkanad', 'Aluva', 'Fort Kochi', 'Tripunithura'],
      },
      {
        id: 'thiruvananthapuram',
        name: 'Thiruvananthapuram',
        headquarters: 'Thiruvananthapuram',
        lat: 8.5241,
        lng: 76.9366,
        isPopular: true,
        cities: ['Thiruvananthapuram City', 'Thampanoor', 'Chacka', 'Pattom', 'Kowdiar', 'Kazhakoottam', 'Neyyattinkara'],
      },
      {
        id: 'kozhikode',
        name: 'Kozhikode',
        headquarters: 'Kozhikode',
        lat: 11.2588,
        lng: 75.7804,
        isPopular: true,
        cities: ['Kozhikode City', 'Palazhi', 'Mavoor Road', 'Mananchira', 'Kallayi'],
      },
      {
        id: 'thrissur',
        name: 'Thrissur',
        headquarters: 'Thrissur',
        lat: 10.5276,
        lng: 76.2144,
        isPopular: false,
        cities: ['Thrissur City', 'Round South', 'Kokkala', 'Ollur', 'Chalakudy'],
      },
      {
        id: 'kollam',
        name: 'Kollam',
        headquarters: 'Kollam',
        lat: 8.8932,
        lng: 76.6141,
        isPopular: false,
        cities: ['Kollam City', 'Chinnakada', 'Karunagappally'],
      },
    ],
  },

  // 7. Andhra Pradesh
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    type: 'State',
    capital: 'Amaravati',
    lat: 16.5062,
    lng: 80.6480,
    isPopular: true,
    districts: [
      {
        id: 'visakhapatnam',
        name: 'Visakhapatnam',
        headquarters: 'Visakhapatnam',
        lat: 17.6868,
        lng: 83.2185,
        isPopular: true,
        cities: ['Visakhapatnam City', 'Beach Road', 'Jagadamba Centre', 'Gajuwaka', 'Madhurawada', 'Siripuram'],
      },
      {
        id: 'krishna_ntr',
        name: 'NTR (Vijayawada)',
        headquarters: 'Vijayawada',
        lat: 16.5062,
        lng: 80.6480,
        isPopular: true,
        cities: ['Vijayawada City', 'MG Road', 'Governorpet', 'Benz Circle', 'Bhavanipuram'],
      },
      {
        id: 'guntur',
        name: 'Guntur',
        headquarters: 'Guntur',
        lat: 16.3067,
        lng: 80.4365,
        isPopular: false,
        cities: ['Guntur City', 'Brodipet', 'Arundelpet', 'Tenali'],
      },
      {
        id: 'tirupati_dist',
        name: 'Tirupati',
        headquarters: 'Tirupati',
        lat: 13.6288,
        lng: 79.4192,
        isPopular: true,
        cities: ['Tirupati City', 'Korlagunta', 'Renigunta', 'Chandragiri', 'Srikalahasti'],
      },
    ],
  },

  // 8. Uttar Pradesh
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    type: 'State',
    capital: 'Lucknow',
    lat: 26.8467,
    lng: 80.9462,
    isPopular: true,
    districts: [
      {
        id: 'gautam_buddha_nagar',
        name: 'Gautam Buddha Nagar (Noida)',
        headquarters: 'Noida',
        lat: 28.5355,
        lng: 77.3910,
        isPopular: true,
        cities: ['Noida Sector 18', 'Noida Sector 32', 'Greater Noida', 'Sector 62', 'Sector 50'],
      },
      {
        id: 'lucknow',
        name: 'Lucknow',
        headquarters: 'Lucknow',
        lat: 26.8467,
        lng: 80.9462,
        isPopular: true,
        cities: ['Lucknow City', 'Gomti Nagar', 'Alambagh', 'Hazratganj', 'Indira Nagar', 'Mahanagar'],
      },
      {
        id: 'kanpur_nagar',
        name: 'Kanpur Nagar',
        headquarters: 'Kanpur',
        lat: 26.4499,
        lng: 80.3319,
        isPopular: false,
        cities: ['Kanpur City', 'MG Marg', 'Civil Lines', 'Swaroop Nagar', 'Kidwai Nagar'],
      },
      {
        id: 'varanasi',
        name: 'Varanasi',
        headquarters: 'Varanasi',
        lat: 25.3176,
        lng: 82.9739,
        isPopular: true,
        cities: ['Varanasi City', 'Varanasi Cantonment', 'Sigra', 'Godowlia', 'Lanka'],
      },
      {
        id: 'agra',
        name: 'Agra',
        headquarters: 'Agra',
        lat: 27.1767,
        lng: 78.0081,
        isPopular: false,
        cities: ['Agra City', 'Agra Cantonment', 'Sanjay Place', 'Tajganj'],
      },
      {
        id: 'ghaziabad',
        name: 'Ghaziabad',
        headquarters: 'Ghaziabad',
        lat: 28.6692,
        lng: 77.4538,
        isPopular: false,
        cities: ['Ghaziabad City', 'Indirapuram', 'Vaishali', 'Raj Nagar'],
      },
    ],
  },

  // 9. Gujarat
  {
    code: 'GJ',
    name: 'Gujarat',
    type: 'State',
    capital: 'Gandhinagar',
    lat: 23.0225,
    lng: 72.5714,
    isPopular: true,
    districts: [
      {
        id: 'ahmedabad',
        name: 'Ahmedabad',
        headquarters: 'Ahmedabad',
        lat: 23.0225,
        lng: 72.5714,
        isPopular: true,
        cities: ['Ahmedabad City', 'Vastrapur', 'SG Highway', 'Thaltej', 'Navrangpura', 'Maninagar', 'Satellite', 'Bopal'],
      },
      {
        id: 'surat',
        name: 'Surat',
        headquarters: 'Surat',
        lat: 21.1702,
        lng: 72.8311,
        isPopular: true,
        cities: ['Surat City', 'Dumas Road', 'Adajan', 'Pal', 'Varachha', 'Piplod'],
      },
      {
        id: 'vadodara',
        name: 'Vadodara',
        headquarters: 'Vadodara',
        lat: 22.3072,
        lng: 73.1812,
        isPopular: false,
        cities: ['Vadodara City', 'Alkapuri', 'Gorwa Road', 'Fatehgunj', 'Manjalpur'],
      },
      {
        id: 'rajkot',
        name: 'Rajkot',
        headquarters: 'Rajkot',
        lat: 22.3039,
        lng: 70.8022,
        isPopular: false,
        cities: ['Rajkot City', 'Kalawad Road', 'Yagnik Road', 'Mota Mava'],
      },
    ],
  },

  // 10. West Bengal
  {
    code: 'WB',
    name: 'West Bengal',
    type: 'State',
    capital: 'Kolkata',
    lat: 22.5726,
    lng: 88.3639,
    isPopular: true,
    districts: [
      {
        id: 'kolkata',
        name: 'Kolkata',
        headquarters: 'Kolkata',
        lat: 22.5726,
        lng: 88.3639,
        isPopular: true,
        cities: ['Park Circus', 'Salt Lake (Bidhannagar)', 'New Town', 'Ballygunge', 'Rabindra Sadan', 'Gariahat', 'Kankurgachi', 'Esplanade', 'Behala'],
      },
      {
        id: 'howrah',
        name: 'Howrah',
        headquarters: 'Howrah',
        lat: 22.5958,
        lng: 88.2636,
        isPopular: false,
        cities: ['Howrah City', 'Shibpur', 'Salkia', 'Bally'],
      },
      {
        id: 'darjeeling_siliguri',
        name: 'Darjeeling (Siliguri)',
        headquarters: 'Siliguri',
        lat: 26.7271,
        lng: 88.3953,
        isPopular: false,
        cities: ['Siliguri City', 'Sevoke Road', 'Matigara', 'Darjeeling Town'],
      },
    ],
  },

  // 11. Rajasthan
  {
    code: 'RJ',
    name: 'Rajasthan',
    type: 'State',
    capital: 'Jaipur',
    lat: 26.9124,
    lng: 75.7873,
    isPopular: true,
    districts: [
      {
        id: 'jaipur',
        name: 'Jaipur',
        headquarters: 'Jaipur',
        lat: 26.9124,
        lng: 75.7873,
        isPopular: true,
        cities: ['Jaipur City', 'C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'Tonk Road'],
      },
      {
        id: 'jodhpur',
        name: 'Jodhpur',
        headquarters: 'Jodhpur',
        lat: 26.2389,
        lng: 73.0243,
        isPopular: false,
        cities: ['Jodhpur City', 'Sardarpura', 'Paota', 'Ratanada'],
      },
      {
        id: 'udaipur',
        name: 'Udaipur',
        headquarters: 'Udaipur',
        lat: 24.5854,
        lng: 73.7125,
        isPopular: false,
        cities: ['Udaipur City', 'Bhuwana', 'Fatehpura', 'Panchwati'],
      },
    ],
  },

  // 12. Punjab & Chandigarh
  {
    code: 'PB',
    name: 'Punjab',
    type: 'State',
    capital: 'Chandigarh',
    lat: 31.1471,
    lng: 75.3412,
    isPopular: false,
    districts: [
      {
        id: 'ludhiana',
        name: 'Ludhiana',
        headquarters: 'Ludhiana',
        lat: 30.9010,
        lng: 75.8573,
        isPopular: true,
        cities: ['Ludhiana City', 'Mall Road', 'Ferozepur Road', 'Civil Lines'],
      },
      {
        id: 'amritsar',
        name: 'Amritsar',
        headquarters: 'Amritsar',
        lat: 31.6340,
        lng: 74.8723,
        isPopular: true,
        cities: ['Amritsar City', 'GT Road', 'Ranjit Avenue', 'Lawrence Road'],
      },
    ],
  },
  {
    code: 'CH',
    name: 'Chandigarh',
    type: 'Union Territory',
    capital: 'Chandigarh',
    lat: 30.7333,
    lng: 76.7794,
    isPopular: true,
    districts: [
      {
        id: 'chandigarh',
        name: 'Chandigarh',
        headquarters: 'Chandigarh',
        lat: 30.7333,
        lng: 76.7794,
        isPopular: true,
        cities: ['Sector 17', 'Industrial Area Phase 1 (Elante)', 'Sector 35', 'Sector 22', 'Manimajra'],
      },
    ],
  },

  // 13. Madhya Pradesh
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    type: 'State',
    capital: 'Bhopal',
    lat: 23.2599,
    lng: 77.4126,
    isPopular: false,
    districts: [
      {
        id: 'indore',
        name: 'Indore',
        headquarters: 'Indore',
        lat: 22.7196,
        lng: 75.8577,
        isPopular: true,
        cities: ['Indore City', 'MG Road', 'Vijay Nagar', 'AB Road', 'Palasia'],
      },
      {
        id: 'bhopal',
        name: 'Bhopal',
        headquarters: 'Bhopal',
        lat: 23.2599,
        lng: 77.4126,
        isPopular: false,
        cities: ['Bhopal City', 'Arera Hills', 'MP Nagar', 'Hoshangabad Road'],
      },
    ],
  },

  // 14. Bihar
  {
    code: 'BR',
    name: 'Bihar',
    type: 'State',
    capital: 'Patna',
    lat: 25.5941,
    lng: 85.1376,
    isPopular: false,
    districts: [
      {
        id: 'patna',
        name: 'Patna',
        headquarters: 'Patna',
        lat: 25.5941,
        lng: 85.1376,
        isPopular: true,
        cities: ['Patna City', 'Patliputra Colony', 'Gandhi Maidan', 'Boring Road', 'Kankarbagh'],
      },
    ],
  },

  // 15. Jharkhand
  {
    code: 'JH',
    name: 'Jharkhand',
    type: 'State',
    capital: 'Ranchi',
    lat: 23.3441,
    lng: 85.3096,
    isPopular: false,
    districts: [
      {
        id: 'ranchi',
        name: 'Ranchi',
        headquarters: 'Ranchi',
        lat: 23.3441,
        lng: 85.3096,
        isPopular: false,
        cities: ['Ranchi City', 'Circular Road', 'Main Road', 'Harmu'],
      },
    ],
  },

  // 16. Assam
  {
    code: 'AS',
    name: 'Assam',
    type: 'State',
    capital: 'Dispur',
    lat: 26.1445,
    lng: 91.7362,
    isPopular: false,
    districts: [
      {
        id: 'kamrup_metro',
        name: 'Kamrup Metropolitan (Guwahati)',
        headquarters: 'Guwahati',
        lat: 26.1445,
        lng: 91.7362,
        isPopular: true,
        cities: ['Guwahati City', 'GS Road', 'Christian Basti', 'Paltan Bazaar', 'Zoo Road'],
      },
    ],
  },

  // 17. Goa
  {
    code: 'GA',
    name: 'Goa',
    type: 'State',
    capital: 'Panaji',
    lat: 15.2993,
    lng: 74.1240,
    isPopular: false,
    districts: [
      {
        id: 'north_goa',
        name: 'North Goa',
        headquarters: 'Panaji',
        lat: 15.4909,
        lng: 73.8278,
        isPopular: true,
        cities: ['Panaji', 'Porvorim', 'Mapusa', 'Calangute'],
      },
      {
        id: 'south_goa',
        name: 'South Goa',
        headquarters: 'Margao',
        lat: 15.2832,
        lng: 73.9862,
        isPopular: false,
        cities: ['Margao', 'Vasco da Gama', 'Ponda'],
      },
    ],
  },

  // 18. Puducherry
  {
    code: 'PY',
    name: 'Puducherry',
    type: 'Union Territory',
    capital: 'Pondicherry',
    lat: 11.9416,
    lng: 79.8083,
    isPopular: true,
    districts: [
      {
        id: 'puducherry_district',
        name: 'Puducherry',
        headquarters: 'Pondicherry',
        lat: 11.9416,
        lng: 79.8083,
        isPopular: true,
        cities: ['White Town', 'Heritage Town', 'Thiruvalluvar Salai', 'Muthialpet', 'Oulgaret', 'Villianur'],
      },
    ],
  },

  // 19. Jammu and Kashmir
  {
    code: 'JK',
    name: 'Jammu and Kashmir',
    type: 'Union Territory',
    capital: 'Srinagar / Jammu',
    lat: 34.0837,
    lng: 74.7973,
    isPopular: false,
    districts: [
      {
        id: 'srinagar',
        name: 'Srinagar',
        headquarters: 'Srinagar',
        lat: 34.0837,
        lng: 74.7973,
        isPopular: false,
        cities: ['Srinagar City', 'Shivpora', 'Lal Chowk', 'Rajbagh'],
      },
      {
        id: 'jammu',
        name: 'Jammu',
        headquarters: 'Jammu',
        lat: 32.7266,
        lng: 74.8570,
        isPopular: false,
        cities: ['Jammu City', 'Channi Himmat', 'Gandhi Nagar', 'Bahu Plaza'],
      },
    ],
  },

  // 20. Haryana
  {
    code: 'HR',
    name: 'Haryana',
    type: 'State',
    capital: 'Chandigarh',
    lat: 29.0588,
    lng: 76.0856,
    isPopular: true,
    districts: [
      {
        id: 'gurugram',
        name: 'Gurugram',
        headquarters: 'Gurugram',
        lat: 28.4595,
        lng: 77.0266,
        isPopular: true,
        cities: ['Cyber City', 'MG Road', 'Golf Course Road', 'Sohna Road', 'Sector 29'],
      },
      {
        id: 'faridabad',
        name: 'Faridabad',
        headquarters: 'Faridabad',
        lat: 28.4089,
        lng: 77.3178,
        isPopular: false,
        cities: ['Faridabad City', 'NIT Faridabad', 'Sector 15', 'Badkal'],
      },
    ],
  },

  // 21. Odisha
  {
    code: 'OD',
    name: 'Odisha',
    type: 'State',
    capital: 'Bhubaneswar',
    lat: 20.2961,
    lng: 85.8245,
    isPopular: false,
    districts: [
      {
        id: 'khordha_bhubaneswar',
        name: 'Khordha (Bhubaneswar)',
        headquarters: 'Bhubaneswar',
        lat: 20.2961,
        lng: 85.8245,
        isPopular: true,
        cities: ['Bhubaneswar City', 'Saheed Nagar', 'Patia', 'Jayadev Vihar', 'Khandagiri'],
      },
      {
        id: 'cuttack',
        name: 'Cuttack',
        headquarters: 'Cuttack',
        lat: 20.4625,
        lng: 85.8828,
        isPopular: false,
        cities: ['Cuttack City', 'Badambadi', 'Buxi Bazaar', 'Choudwar'],
      },
    ],
  },

  // 22. Chhattisgarh
  {
    code: 'CG',
    name: 'Chhattisgarh',
    type: 'State',
    capital: 'Raipur',
    lat: 21.2514,
    lng: 81.6296,
    isPopular: false,
    districts: [
      {
        id: 'raipur',
        name: 'Raipur',
        headquarters: 'Raipur',
        lat: 21.2514,
        lng: 81.6296,
        isPopular: false,
        cities: ['Raipur City', 'Pandri', 'Civil Lines', 'Telibandha'],
      },
    ],
  },

  // 23. Uttarakhand
  {
    code: 'UK',
    name: 'Uttarakhand',
    type: 'State',
    capital: 'Dehradun',
    lat: 30.3165,
    lng: 78.0322,
    isPopular: false,
    districts: [
      {
        id: 'dehradun',
        name: 'Dehradun',
        headquarters: 'Dehradun',
        lat: 30.3165,
        lng: 78.0322,
        isPopular: false,
        cities: ['Dehradun City', 'Rajpur Road', 'Jakhan', 'Clock Tower'],
      },
    ],
  },

  // 24. Himachal Pradesh
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    type: 'State',
    capital: 'Shimla',
    lat: 31.1048,
    lng: 77.1734,
    isPopular: false,
    districts: [
      {
        id: 'shimla',
        name: 'Shimla',
        headquarters: 'Shimla',
        lat: 31.1048,
        lng: 77.1734,
        isPopular: false,
        cities: ['Shimla City', 'The Mall', 'Chotta Shimla', 'Sanjauli'],
      },
    ],
  },

  // Remaining States & UTs (Representing complete 28 States & 8 UTs)
  {
    code: 'AR',
    name: 'Arunachal Pradesh',
    type: 'State',
    capital: 'Itanagar',
    lat: 27.0844,
    lng: 93.6053,
    isPopular: false,
    districts: [{ id: 'papum_pare', name: 'Papum Pare', headquarters: 'Itanagar', lat: 27.0844, lng: 93.6053, cities: ['Itanagar', 'Naharlagun'] }],
  },
  {
    code: 'MN',
    name: 'Manipur',
    type: 'State',
    capital: 'Imphal',
    lat: 24.8170,
    lng: 93.9368,
    isPopular: false,
    districts: [{ id: 'imphal_west', name: 'Imphal West', headquarters: 'Imphal', lat: 24.8170, lng: 93.9368, cities: ['Imphal City'] }],
  },
  {
    code: 'ML',
    name: 'Meghalaya',
    type: 'State',
    capital: 'Shillong',
    lat: 25.5788,
    lng: 91.8933,
    isPopular: false,
    districts: [{ id: 'east_khasi_hills', name: 'East Khasi Hills', headquarters: 'Shillong', lat: 25.5788, lng: 91.8933, cities: ['Shillong', 'Police Bazar'] }],
  },
  {
    code: 'MZ',
    name: 'Mizoram',
    type: 'State',
    capital: 'Aizawl',
    lat: 23.7271,
    lng: 92.7176,
    isPopular: false,
    districts: [{ id: 'aizawl', name: 'Aizawl', headquarters: 'Aizawl', lat: 23.7271, lng: 92.7176, cities: ['Aizawl City'] }],
  },
  {
    code: 'NL',
    name: 'Nagaland',
    type: 'State',
    capital: 'Kohima',
    lat: 25.6751,
    lng: 94.1086,
    isPopular: false,
    districts: [{ id: 'dimapur', name: 'Dimapur', headquarters: 'Dimapur', lat: 25.9068, lng: 93.7272, cities: ['Dimapur City', 'Kohima'] }],
  },
  {
    code: 'SK',
    name: 'Sikkim',
    type: 'State',
    capital: 'Gangtok',
    lat: 27.3314,
    lng: 88.6138,
    isPopular: false,
    districts: [{ id: 'east_sikkim', name: 'Gangtok District', headquarters: 'Gangtok', lat: 27.3314, lng: 88.6138, cities: ['Gangtok', 'MG Marg'] }],
  },
  {
    code: 'TR',
    name: 'Tripura',
    type: 'State',
    capital: 'Agartala',
    lat: 23.8315,
    lng: 91.2868,
    isPopular: false,
    districts: [{ id: 'west_tripura', name: 'West Tripura', headquarters: 'Agartala', lat: 23.8315, lng: 91.2868, cities: ['Agartala City'] }],
  },
  {
    code: 'AN',
    name: 'Andaman and Nicobar Islands',
    type: 'Union Territory',
    capital: 'Port Blair',
    lat: 11.6234,
    lng: 92.7265,
    isPopular: false,
    districts: [{ id: 'south_andaman', name: 'South Andaman', headquarters: 'Port Blair', lat: 11.6234, lng: 92.7265, cities: ['Port Blair'] }],
  },
  {
    code: 'DNHDD',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'Union Territory',
    capital: 'Daman',
    lat: 20.3974,
    lng: 72.8328,
    isPopular: false,
    districts: [{ id: 'daman', name: 'Daman', headquarters: 'Daman', lat: 20.3974, lng: 72.8328, cities: ['Daman', 'Silvassa'] }],
  },
  {
    code: 'LA',
    name: 'Ladakh',
    type: 'Union Territory',
    capital: 'Leh',
    lat: 34.1526,
    lng: 77.5771,
    isPopular: false,
    districts: [{ id: 'leh', name: 'Leh', headquarters: 'Leh', lat: 34.1526, lng: 77.5771, cities: ['Leh Town'] }],
  },
  {
    code: 'LD',
    name: 'Lakshadweep',
    type: 'Union Territory',
    capital: 'Kavaratti',
    lat: 10.5667,
    lng: 72.6417,
    isPopular: false,
    districts: [{ id: 'lakshadweep', name: 'Lakshadweep', headquarters: 'Kavaratti', lat: 10.5667, lng: 72.6417, cities: ['Kavaratti'] }],
  },
];

/**
 * Get all 36 States and Union Territories with metadata
 */
const getAllStates = () => {
  return ALL_INDIA_STATES.map((s) => ({
    code: s.code,
    name: s.name,
    type: s.type,
    capital: s.capital,
    lat: s.lat,
    lng: s.lng,
    isPopular: s.isPopular,
    districtsCount: s.districts.length,
  }));
};

/**
 * Lookup State by code or name
 */
const getStateByCodeOrName = (identifier) => {
  if (!identifier) return null;
  const clean = identifier.toString().toLowerCase().trim();
  return (
    ALL_INDIA_STATES.find(
      (s) => s.code.toLowerCase() === clean || s.name.toLowerCase() === clean
    ) || null
  );
};

/**
 * Get districts for a given state
 */
const getDistrictsForState = (stateIdentifier) => {
  const stateObj = getStateByCodeOrName(stateIdentifier);
  if (!stateObj) return [];
  return stateObj.districts;
};

/**
 * Find closest State and District based on geographic coordinates
 */
const findStateAndDistrictByCoords = (lat, lng) => {
  let closestState = ALL_INDIA_STATES[0];
  let minStateDist = Infinity;

  for (const st of ALL_INDIA_STATES) {
    const d = Math.hypot(st.lat - lat, st.lng - lng);
    if (d < minStateDist) {
      minStateDist = d;
      closestState = st;
    }
  }

  // Find closest district within the state
  let closestDistrict = closestState.districts[0];
  let minDist = Infinity;
  for (const dist of closestState.districts) {
    const d = Math.hypot(dist.lat - lat, dist.lng - lng);
    if (d < minDist) {
      minDist = d;
      closestDistrict = dist;
    }
  }

  return {
    state: closestState.name,
    stateCode: closestState.code,
    district: closestDistrict ? closestDistrict.name : closestState.capital,
    city: closestDistrict ? (closestDistrict.cities[0] || closestDistrict.headquarters) : closestState.capital,
  };
};

/**
 * Search locations across all 36 States/UTs, districts, and towns
 */
const searchIndiaLocations = (query) => {
  if (!query || typeof query !== 'string') return [];
  const q = query.toLowerCase().trim();
  const results = [];

  for (const st of ALL_INDIA_STATES) {
    // Match state name
    if (st.name.toLowerCase().includes(q)) {
      results.push({
        name: st.name,
        type: st.type,
        state: st.name,
        district: st.capital,
        city: st.capital,
        lat: st.lat,
        lng: st.lng,
        displayName: `${st.name} (${st.type}), India`,
      });
    }

    // Match districts
    for (const dist of st.districts) {
      if (dist.name.toLowerCase().includes(q) || dist.headquarters.toLowerCase().includes(q)) {
        results.push({
          name: `${dist.name} District`,
          type: 'District',
          state: st.name,
          district: dist.name,
          city: dist.headquarters,
          lat: dist.lat,
          lng: dist.lng,
          displayName: `${dist.name} District, ${st.name}, India`,
        });
      }

      // Match cities/towns
      for (const city of dist.cities || []) {
        if (city.toLowerCase().includes(q) && !results.some((r) => r.name === city)) {
          results.push({
            name: city,
            type: 'City / Town',
            state: st.name,
            district: dist.name,
            city,
            lat: dist.lat,
            lng: dist.lng,
            displayName: `${city}, ${dist.name}, ${st.name}, India`,
          });
        }
      }
    }
  }

  return results.slice(0, 15);
};

module.exports = {
  ALL_INDIA_STATES,
  getAllStates,
  getStateByCodeOrName,
  getDistrictsForState,
  findStateAndDistrictByCoords,
  searchIndiaLocations,
};

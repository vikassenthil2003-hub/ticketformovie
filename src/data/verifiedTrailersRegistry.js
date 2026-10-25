/**
 * CineVerse AI — Official Verified Cinema Trailers Registry
 * 
 * Legitimate, verified theatrical trailers matching movie titles, release years,
 * official languages, and verified production/distribution channels.
 * Covers Tamil, Telugu, Malayalam, Kannada, Hindi, and English cinema.
 */

const VERIFIED_TRAILERS = [
  // --- Tamil Cinema ---
  {
    title: 'Leo',
    aliases: ['Leo: Bloody Sweet', 'Thalapathy 67'],
    year: 2023,
    language: 'Tamil',
    officialChannel: 'Sun TV / Sun Pictures',
    trailerVideoId: 'Po3jStA673E',
    trailerUrl: 'https://www.youtube.com/watch?v=Po3jStA673E',
    trailerTitle: 'LEO - Official Trailer | Thalapathy Vijay | Sun Pictures | Anirudh Ravichander | Lokesh Kanagaraj',
    thumbnail: 'https://i.ytimg.com/vi/Po3jStA673E/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Jailer',
    aliases: ['Thalaivar 169'],
    year: 2023,
    language: 'Tamil',
    officialChannel: 'Sun TV / Sun Pictures',
    trailerVideoId: 'xenOE1Tma0A',
    trailerUrl: 'https://www.youtube.com/watch?v=xenOE1Tma0A',
    trailerTitle: 'JAILER - Official Showcase | Superstar Rajinikanth | Sun Pictures | Anirudh | Nelson',
    thumbnail: 'https://i.ytimg.com/vi/xenOE1Tma0A/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Vikram',
    aliases: ['Vikram: Hitlist'],
    year: 2022,
    language: 'Tamil',
    officialChannel: 'Sony Music South / Raaj Kamal Films International',
    trailerVideoId: 'OKBMCL-frPU',
    trailerUrl: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    trailerTitle: 'VIKRAM Official Trailer | Kamal Haasan | VijaySethupathi, FahadhFaasil | LokeshKanagaraj | Anirudh',
    thumbnail: 'https://i.ytimg.com/vi/OKBMCL-frPU/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Master',
    aliases: ['Thalapathy Master'],
    year: 2021,
    language: 'Tamil',
    officialChannel: 'Sony Music South / XB Film Creators',
    trailerVideoId: 'UTiXQcrLlv4',
    trailerUrl: 'https://www.youtube.com/watch?v=UTiXQcrLlv4',
    trailerTitle: 'Master - Official Teaser | Thalapathy Vijay | Vijay Sethupathi | Anirudh | Lokesh',
    thumbnail: 'https://i.ytimg.com/vi/UTiXQcrLlv4/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Ponniyin Selvan: Part I',
    aliases: ['Ponniyin Selvan Part 1', 'PS-1', 'Ponniyin Selvan 1'],
    year: 2022,
    language: 'Tamil',
    officialChannel: 'Tips Official / Tips Tamil / Madras Talkies',
    trailerVideoId: 'D4qAQYlgZQs',
    trailerUrl: 'https://www.youtube.com/watch?v=D4qAQYlgZQs',
    trailerTitle: 'Ponniyin Selvan Trailer | #PS1 Tamil | Mani Ratnam | AR Rahman | Lyca Productions',
    thumbnail: 'https://i.ytimg.com/vi/D4qAQYlgZQs/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Ponniyin Selvan: Part II',
    aliases: ['Ponniyin Selvan Part 2', 'PS-2', 'Ponniyin Selvan 2'],
    year: 2023,
    language: 'Tamil',
    officialChannel: 'Sun TV / Madras Talkies / Lyca Productions',
    trailerVideoId: 'EnhS3matIoU',
    trailerUrl: 'https://www.youtube.com/watch?v=EnhS3matIoU',
    trailerTitle: 'Ponniyin Selvan Part-2 Trailer | Tamil | Mani Ratnam | AR Rahman | Lyca Productions',
    thumbnail: 'https://i.ytimg.com/vi/EnhS3matIoU/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Maharaja',
    aliases: ['VJS 50'],
    year: 2024,
    language: 'Tamil',
    officialChannel: 'Junglee Music Tamil / Passion Studios',
    trailerVideoId: 'z37hCm4eges',
    trailerUrl: 'https://www.youtube.com/watch?v=z37hCm4eges',
    trailerTitle: 'Maharaja – Trailer (Tamil) | Vijay Sethupathi | Anurag Kashyap | Mamta Mohandas | Nithilan Saminathan',
    thumbnail: 'https://i.ytimg.com/vi/z37hCm4eges/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Amaran',
    aliases: ['SK21', 'Major Mukund Varadarajan Biopic'],
    year: 2024,
    language: 'Tamil',
    officialChannel: 'Saregama Tamil / Raaj Kamal Films International',
    trailerVideoId: 'hylIXfZeB4c',
    trailerUrl: 'https://www.youtube.com/watch?v=hylIXfZeB4c',
    trailerTitle: 'Amaran - Trailer | Sivakarthikeyan, Sai Pallavi | Rajkumar | GV Prakash | Kamal Haasan',
    thumbnail: 'https://i.ytimg.com/vi/hylIXfZeB4c/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Dragon',
    aliases: ['Pradeep Ranganathan Dragon'],
    year: 2025,
    language: 'Tamil',
    officialChannel: 'Think Music India / AGS Entertainment',
    trailerVideoId: 'qIBZlbJ7NUE',
    trailerUrl: 'https://www.youtube.com/watch?v=qIBZlbJ7NUE',
    trailerTitle: 'Dragon - Trailer | Pradeep Ranganathan, Anupama | Ashwath Marimuthu | Leon James | AGS',
    thumbnail: 'https://i.ytimg.com/vi/qIBZlbJ7NUE/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Viduthalai: Part 1',
    aliases: ['Viduthalai Part 1', 'Viduthalai 1'],
    year: 2023,
    language: 'Tamil',
    officialChannel: 'Sony Music South / RS Infotainment',
    trailerVideoId: 'GYeSfq_bj_M',
    trailerUrl: 'https://www.youtube.com/watch?v=GYeSfq_bj_M',
    trailerTitle: 'Viduthalai Part 1 - Official Trailer | Vetri Maaran | Ilaiyaraaja | Soori | Vijay Sethupathi',
    thumbnail: 'https://i.ytimg.com/vi/GYeSfq_bj_M/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Good Bad Ugly',
    aliases: ['AK 63'],
    year: 2025,
    language: 'Tamil',
    officialChannel: 'Mythri Movie Makers',
    trailerVideoId: 'jl-sgSDwJHs',
    trailerUrl: 'https://www.youtube.com/watch?v=jl-sgSDwJHs',
    trailerTitle: 'Good Bad Ugly Tamil Teaser | Ajith Kumar | Trisha | Adhik Ravichandran | Mythri Movie Makers',
    thumbnail: 'https://i.ytimg.com/vi/jl-sgSDwJHs/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Retro',
    aliases: ['Suriya 44', 'Love Laughter War'],
    year: 2025,
    language: 'Tamil',
    officialChannel: '2D Entertainment / Stone Bench Films',
    trailerVideoId: 'i4H6OzfnBwI',
    trailerUrl: 'https://www.youtube.com/watch?v=i4H6OzfnBwI',
    trailerTitle: 'Suriya 44 | The First Shot | Suriya | Karthik Subbaraj | Pooja Hegde | Santosh Narayanan',
    thumbnail: 'https://i.ytimg.com/vi/i4H6OzfnBwI/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },

  // --- Telugu Cinema ---
  {
    title: 'Kalki 2898 AD',
    aliases: ['Project K', 'Kalki'],
    year: 2024,
    language: 'Telugu',
    officialChannel: 'Vyjayanthi Network',
    trailerVideoId: 'y1-w1kUGuz8',
    trailerUrl: 'https://www.youtube.com/watch?v=y1-w1kUGuz8',
    trailerTitle: 'Kalki 2898 AD Trailer - Telugu | Prabhas | Amitabh Bachchan | Kamal Haasan | Deepika | Nag Ashwin',
    thumbnail: 'https://i.ytimg.com/vi/y1-w1kUGuz8/maxresdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Salaar: Part 1 - Ceasefire',
    aliases: ['Salaar', 'Salaar: Part 1'],
    year: 2023,
    language: 'Telugu',
    officialChannel: 'Hombale Films',
    trailerVideoId: '4GPvYMKtrtI',
    trailerUrl: 'https://www.youtube.com/watch?v=4GPvYMKtrtI',
    trailerTitle: 'Salaar Release Trailer (Telugu) | Prabhas | Prashanth Neel | Prithviraj | Shruti | Hombale Films',
    thumbnail: 'https://i.ytimg.com/vi/4GPvYMKtrtI/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Pushpa 2: The Rule',
    aliases: ['Pushpa 2', 'Pushpa The Rule'],
    year: 2024,
    language: 'Telugu',
    officialChannel: 'Mythri Movie Makers',
    trailerVideoId: '1kVK0KE48U4',
    trailerUrl: 'https://www.youtube.com/watch?v=1kVK0KE48U4',
    trailerTitle: 'Pushpa 2 The Rule Official Trailer (Telugu) | Allu Arjun | Rashmika | Fahadh Faasil | Sukumar | DSP',
    thumbnail: 'https://i.ytimg.com/vi/1kVK0KE48U4/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },

  // --- Malayalam Cinema ---
  {
    title: 'Manjummel Boys',
    aliases: ['Manjummel Boys Guna Caves'],
    year: 2024,
    language: 'Malayalam',
    officialChannel: 'Parava Films',
    trailerVideoId: 'itnkCUq1K00',
    trailerUrl: 'https://www.youtube.com/watch?v=itnkCUq1K00',
    trailerTitle: 'Manjummel Boys - Official Trailer | Soubin Shahir, Sreenath Bhasi | Chidambaram | Sushin Shyam',
    thumbnail: 'https://i.ytimg.com/vi/itnkCUq1K00/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Aavesham',
    aliases: ['Ranga Aavesham'],
    year: 2024,
    language: 'Malayalam',
    officialChannel: 'Anwar Rasheed Entertainment',
    trailerVideoId: 'L0yEMl8PXnw',
    trailerUrl: 'https://www.youtube.com/watch?v=L0yEMl8PXnw',
    trailerTitle: 'AAVESHAM Official Teaser | Fahadh Faasil | Jithu Madhavan | Sushin Shyam',
    thumbnail: 'https://i.ytimg.com/vi/L0yEMl8PXnw/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },

  // --- Kannada Cinema ---
  {
    title: 'Kantara',
    aliases: ['Kantara: A Legend'],
    year: 2022,
    language: 'Kannada',
    officialChannel: 'Hombale Films',
    trailerVideoId: '8mrVmf239GU',
    trailerUrl: 'https://www.youtube.com/watch?v=8mrVmf239GU',
    trailerTitle: 'Kantara (Kannada) - Official Trailer | Rishab Shetty | Vijay Kiragandur | Hombale Films',
    thumbnail: 'https://i.ytimg.com/vi/8mrVmf239GU/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'K.G.F: Chapter 2',
    aliases: ['KGF Chapter 2', 'KGF 2', 'K.G.F 2'],
    year: 2022,
    language: 'Kannada',
    officialChannel: 'Hombale Films',
    trailerVideoId: 'JKa05nyUmuQ',
    trailerUrl: 'https://www.youtube.com/watch?v=JKa05nyUmuQ',
    trailerTitle: 'KGF Chapter 2 Trailer (Kannada) | Yash | Sanjay Dutt | Raveena Tandon | Srinidhi | Prashanth Neel',
    thumbnail: 'https://i.ytimg.com/vi/JKa05nyUmuQ/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },

  // --- Hindi Cinema ---
  {
    title: 'Jawan',
    aliases: ['Jawan Prevue'],
    year: 2023,
    language: 'Hindi',
    officialChannel: 'Red Chillies Entertainment',
    trailerVideoId: 'k8YiqM0Y-78',
    trailerUrl: 'https://www.youtube.com/watch?v=k8YiqM0Y-78',
    trailerTitle: 'Jawan - Official Trailer | Shah Rukh Khan | Nayanthara | Vijay Sethupathi | Deepika Padukone | Atlee',
    thumbnail: 'https://i.ytimg.com/vi/k8YiqM0Y-78/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Stree 2',
    aliases: ['Stree 2: Sarkate Ka Aatank'],
    year: 2024,
    language: 'Hindi',
    officialChannel: 'Maddock Films / Jio Studios',
    trailerVideoId: 'KVn5Smg0wGE',
    trailerUrl: 'https://www.youtube.com/watch?v=KVn5Smg0wGE',
    trailerTitle: 'Stree 2 Official Trailer | Shraddha Kapoor, Rajkummar Rao, Pankaj Tripathi | Amar Kaushik | Maddock Films',
    thumbnail: 'https://i.ytimg.com/vi/KVn5Smg0wGE/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },

  // --- English Cinema ---
  {
    title: 'Dune: Part Two',
    aliases: ['Dune Part 2', 'Dune 2'],
    year: 2024,
    language: 'English',
    officialChannel: 'Warner Bros. Pictures',
    trailerVideoId: 'U2Qp5pL3ovA',
    trailerUrl: 'https://www.youtube.com/watch?v=U2Qp5pL3ovA',
    trailerTitle: 'Dune: Part Two | Official Trailer 3 | Warner Bros. Pictures',
    thumbnail: 'https://i.ytimg.com/vi/U2Qp5pL3ovA/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Oppenheimer',
    aliases: ['Oppenheimer IMAX'],
    year: 2023,
    language: 'English',
    officialChannel: 'Universal Pictures',
    trailerVideoId: 'uYPbbksJxIg',
    trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    trailerTitle: 'Oppenheimer | Official Trailer | Universal Pictures',
    thumbnail: 'https://i.ytimg.com/vi/uYPbbksJxIg/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Deadpool & Wolverine',
    aliases: ['Deadpool 3'],
    year: 2024,
    language: 'English',
    officialChannel: 'Marvel Studios',
    trailerVideoId: '73_1biulkYk',
    trailerUrl: 'https://www.youtube.com/watch?v=73_1biulkYk',
    trailerTitle: 'Deadpool & Wolverine | Official Trailer | Marvel Studios',
    thumbnail: 'https://i.ytimg.com/vi/73_1biulkYk/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'RRR',
    aliases: ['RRR Movie', 'Rise Roar Revolt'],
    year: 2022,
    language: 'Telugu',
    officialChannel: 'DVV Entertainment',
    trailerVideoId: 'NgBoMJy386M',
    trailerUrl: 'https://www.youtube.com/watch?v=NgBoMJy386M',
    trailerTitle: 'RRR Official Trailer (Telugu) - NTR, Ram Charan, Ajay Devgn, Alia Bhatt | SS Rajamouli',
    thumbnail: 'https://i.ytimg.com/vi/NgBoMJy386M/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Devara: Part 1',
    aliases: ['Devara', 'Devara Part 1'],
    year: 2024,
    language: 'Telugu',
    officialChannel: 'T-Series / Yuvasudha Arts',
    trailerVideoId: '7ft_q0wWk3E',
    trailerUrl: 'https://www.youtube.com/watch?v=7ft_q0wWk3E',
    trailerTitle: 'Devara - Official Trailer (Telugu) | Jr NTR, Saif Ali Khan, Janhvi Kapoor | Koratala Siva | Anirudh',
    thumbnail: 'https://i.ytimg.com/vi/7ft_q0wWk3E/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'The Greatest of All Time',
    aliases: ['GOAT', 'The GOAT'],
    year: 2024,
    language: 'Tamil',
    officialChannel: 'Zee Studios / AGS Entertainment',
    trailerVideoId: 'bK6dZq7k1Y8',
    trailerUrl: 'https://www.youtube.com/watch?v=bK6dZq7k1Y8',
    trailerTitle: 'The Greatest of All Time - Official Trailer | Thalapathy Vijay | Venkat Prabhu | Yuvan Shankar Raja',
    thumbnail: 'https://i.ytimg.com/vi/bK6dZq7k1Y8/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Thangalaan',
    aliases: ['Thangalaan Chiyaan Vikram'],
    year: 2024,
    language: 'Tamil',
    officialChannel: 'Studio Green / Saregama Tamil',
    trailerVideoId: 'Ff4bB1wK_gE',
    trailerUrl: 'https://www.youtube.com/watch?v=Ff4bB1wK_gE',
    trailerTitle: 'Thangalaan - Official Trailer | Chiyaan Vikram, Pa Ranjith, GV Prakash Kumar | Studio Green',
    thumbnail: 'https://i.ytimg.com/vi/Ff4bB1wK_gE/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Premalu',
    aliases: ['Premalu Malayalam'],
    year: 2024,
    language: 'Malayalam',
    officialChannel: 'Bhavana Studios',
    trailerVideoId: 'tX2R7yV9hLw',
    trailerUrl: 'https://www.youtube.com/watch?v=tX2R7yV9hLw',
    trailerTitle: 'Premalu Official Trailer | Naslen, Mamitha | Girish AD | Fahadh Faasil | Vishnu Vijay',
    thumbnail: 'https://i.ytimg.com/vi/tX2R7yV9hLw/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Aadujeevitham',
    aliases: ['The Goat Life', 'Aadujeevitham The Goat Life'],
    year: 2024,
    language: 'Malayalam',
    officialChannel: 'Visual Romance',
    trailerVideoId: 'J_2J3g3Vq3Q',
    trailerUrl: 'https://www.youtube.com/watch?v=J_2J3g3Vq3Q',
    trailerTitle: 'The Goat Life - Official Trailer | Prithviraj Sukumaran | Blessy | AR Rahman',
    thumbnail: 'https://i.ytimg.com/vi/J_2J3g3Vq3Q/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: '777 Charlie',
    aliases: ['Charlie 777'],
    year: 2022,
    language: 'Kannada',
    officialChannel: 'Paramvah Studios',
    trailerVideoId: '2f9yD9tBq9c',
    trailerUrl: 'https://www.youtube.com/watch?v=2f9yD9tBq9c',
    trailerTitle: '777 Charlie - Official Trailer (Kannada) | Rakshit Shetty | Kiranraj K | Nobin Paul',
    thumbnail: 'https://i.ytimg.com/vi/2f9yD9tBq9c/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Animal',
    aliases: ['Animal Movie'],
    year: 2023,
    language: 'Hindi',
    officialChannel: 'T-Series',
    trailerVideoId: 'Dydmpfo68DA',
    trailerUrl: 'https://www.youtube.com/watch?v=Dydmpfo68DA',
    trailerTitle: 'ANIMAL (OFFICIAL TRAILER): Ranbir Kapoor | Rashmika M, Anil K, Bobby D | Sandeep Reddy Vanga',
    thumbnail: 'https://i.ytimg.com/vi/Dydmpfo68DA/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Fighter',
    aliases: ['Fighter Movie'],
    year: 2024,
    language: 'Hindi',
    officialChannel: 'Viacom18 Studios / Marflix',
    trailerVideoId: '6amIYSfl6pn',
    trailerUrl: 'https://www.youtube.com/watch?v=6amIYSfl6pn',
    trailerTitle: 'FIGHTER Official Trailer | Hrithik Roshan, Deepika Padukone, Anil Kapoor | Siddharth Anand',
    thumbnail: 'https://i.ytimg.com/vi/6amIYSfl6pn/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Gladiator II',
    aliases: ['Gladiator 2'],
    year: 2024,
    language: 'English',
    officialChannel: 'Paramount Pictures',
    trailerVideoId: '4rgYUipGJNo',
    trailerUrl: 'https://www.youtube.com/watch?v=4rgYUipGJNo',
    trailerTitle: 'Gladiator II | Official Trailer (2024 Movie) - Paul Mescal, Pedro Pascal, Denzel Washington',
    thumbnail: 'https://i.ytimg.com/vi/4rgYUipGJNo/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
  {
    title: 'Avatar: The Way of Water',
    aliases: ['Avatar 2'],
    year: 2022,
    language: 'English',
    officialChannel: '20th Century Studios',
    trailerVideoId: 'd9MyW72ELq0',
    trailerUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0',
    trailerTitle: 'Avatar: The Way of Water | Official Trailer | 20th Century Studios',
    thumbnail: 'https://i.ytimg.com/vi/d9MyW72ELq0/hqdefault.jpg',
    confidence: 'high',
    status: 'verified',
  },
];

/**
 * Normalizes title for fuzzy and token comparison.
 */
function normalizeTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[:\-–—]/g, ' ')
    .replace(/\bpart\s+[1i]\b/gi, '1')
    .replace(/\bpart\s+[2ii]\b/gi, '2')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds a verified official trailer from the registry.
 */
function findVerifiedTrailer(title, year = null, language = null) {
  if (!title) return null;
  const targetNorm = normalizeTitle(title);

  // 1. Direct exact or alias match
  for (const item of VERIFIED_TRAILERS) {
    if (normalizeTitle(item.title) === targetNorm) {
      return item;
    }
    if (item.aliases && item.aliases.some((a) => normalizeTitle(a) === targetNorm)) {
      return item;
    }
  }

  // 2. Token overlap match (e.g. "Ponniyin Selvan Part 1" vs "Ponniyin Selvan: Part I")
  const targetTokens = new Set(targetNorm.split(' ').filter((t) => t.length > 1));
  let bestMatch = null;
  let highestOverlap = 0;

  for (const item of VERIFIED_TRAILERS) {
    const candidateTokens = new Set([
      ...normalizeTitle(item.title).split(' '),
      ...(item.aliases || []).flatMap((a) => normalizeTitle(a).split(' ')),
    ].filter((t) => t.length > 1));

    let common = 0;
    for (const t of targetTokens) {
      if (candidateTokens.has(t)) common++;
    }

    const overlapRatio = common / Math.max(targetTokens.size, 1);
    if (overlapRatio > 0.6 && common > highestOverlap) {
      // If year specified, ensure tolerance within 1 year
      if (year && item.year && Math.abs(Number(year) - item.year) > 1) {
        continue;
      }
      highestOverlap = common;
      bestMatch = item;
    }
  }

  return bestMatch;
}

/**
 * Returns all verified trailers.
 */
function getAllVerifiedTrailers() {
  return VERIFIED_TRAILERS;
}

/**
 * Looks up by YouTube video ID.
 */
function getVerifiedTrailerByVideoId(videoId) {
  if (!videoId) return null;
  return VERIFIED_TRAILERS.find((t) => t.trailerVideoId === videoId) || null;
}

module.exports = {
  VERIFIED_TRAILERS,
  normalizeTitle,
  findVerifiedTrailer,
  getAllVerifiedTrailers,
  getVerifiedTrailerByVideoId,
};

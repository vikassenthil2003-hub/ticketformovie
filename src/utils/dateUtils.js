/**
 * Standardized Date & Showtime Utility for CineVerse AI
 * Built to mirror BookMyShow timezone handling, dynamic date tabs,
 * and chronological showtime filtering.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current timestamp and date parts in specified timezone (default: Asia/Kolkata).
 * @param {string} timeZone
 * @returns {{ dateStr: string, hour: number, minute: number, currentMinutes: number, timeZone: string, isoString: string }}
 */
const getNowInTimezone = (timeZone = DEFAULT_TIMEZONE) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const year = map.year;
  const month = String(map.month).padStart(2, '0');
  const day = String(map.day).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const currentMinutes = hour * 60 + minute;

  return {
    dateStr,
    hour,
    minute,
    currentMinutes,
    timeZone,
    isoString: now.toISOString(),
  };
};

/**
 * Returns a local date string in YYYY-MM-DD format with optional day offset in the target timezone.
 * @param {number} offsetDays - Number of days to add to base date (default: 0)
 * @param {Date|string|number} baseDate - Base date (default: current system time)
 * @param {string} timeZone - Timezone string (default: Asia/Kolkata)
 * @returns {string} Date formatted as 'YYYY-MM-DD'
 */
const getLocalDateString = (offsetDays = 0, baseDate = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const d = new Date(baseDate);
  if (isNaN(d.getTime())) {
    return getNowInTimezone(timeZone).dateStr;
  }

  // Format base date in target timezone to extract its local Y-M-D
  const baseParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const [y, m, day] = baseParts.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, day + offsetDays, 12, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(targetDate);
};

/**
 * Converts a 12-hour or 24-hour time string (e.g. '10:30 AM', '02:15 PM', '18:30')
 * into minutes since midnight (0-1439).
 * @param {string} timeStr
 * @returns {number}
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const trimmed = timeStr.trim().toUpperCase();

  // 12-hour format e.g. '10:30 AM', '02:15 PM', '2:15PM'
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const modifier = match12[3];

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour format e.g. '14:15'
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
};

/**
 * Converts minutes since midnight back to formatted 12-hour time string e.g. '02:15 PM'.
 * @param {number} totalMinutes
 * @returns {string}
 */
const minutesToTime = (totalMinutes) => {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${modifier}`;
};

/**
 * Comparator for chronological sorting of showtimes.
 * @param {string} aTime
 * @param {string} bTime
 * @returns {number}
 */
const compareShowtimes = (aTime, bTime) => {
  return timeToMinutes(aTime) - timeToMinutes(bTime);
};

/**
 * Checks if a showtime on showDate has already started or ended.
 * @param {string} showDate - YYYY-MM-DD
 * @param {string} startTime - e.g. '10:30 AM'
 * @param {string} timeZone - default 'Asia/Kolkata'
 * @param {number} graceMinutes - buffer after start time (default: 0)
 * @returns {boolean}
 */
const isShowInPast = (showDate, startTime, timeZone = DEFAULT_TIMEZONE, graceMinutes = 0) => {
  const { dateStr: todayStr, currentMinutes } = getNowInTimezone(timeZone);
  if (showDate < todayStr) return true;
  if (showDate > todayStr) return false;
  // If today: check if show start time has elapsed
  const showMins = timeToMinutes(startTime);
  return showMins <= currentMinutes - graceMinutes;
};

/**
 * Calculates estimated end time from start time and movie duration.
 * Adds 15 minutes buffer for intermissions and turnaround.
 * @param {string} startTime
 * @param {number} durationMinutes
 * @returns {string}
 */
const calculateEndTime = (startTime, durationMinutes = 150) => {
  const startMins = timeToMinutes(startTime);
  const endMins = startMins + durationMinutes + 15;
  return minutesToTime(endMins);
};

/**
 * Generates an array of dynamic date tab objects for Today, Tomorrow, and upcoming dates.
 * Mirrors BookMyShow's date selector.
 * @param {number} count - Number of consecutive days (default: 7)
 * @param {Date|string} baseDate - Starting reference date (default: current server time)
 * @param {string} timeZone - Timezone string (default: Asia/Kolkata)
 * @returns {Array<{dateStr: string, dayName: string, formattedDate: string, dayNum: string, monthName: string, isToday: boolean, isTomorrow: boolean, isDayAfter: boolean}>}
 */
const getDynamicDateTabs = (count = 7, baseDate = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const { dateStr: todayStr } = getNowInTimezone(timeZone);
  const [ty, tm, tday] = todayStr.split('-').map(Number);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(ty, tm - 1, tday + i, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const parts = formatter.formatToParts(d);
    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const dateStr = getLocalDateString(i, baseDate, timeZone);
    const dayName =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : i === 2
        ? 'Day After'
        : map.weekday || d.toLocaleDateString('en-US', { weekday: 'short' });

    const formattedDate = `${map.day} ${map.month}`;

    return {
      dateStr,
      dayName,
      dayNum: map.day,
      monthName: map.month,
      formattedDate,
      isToday: i === 0,
      isTomorrow: i === 1,
      isDayAfter: i === 2,
    };
  });
};

/**
 * Validates if a string is a valid YYYY-MM-DD date.
 * @param {string} str
 * @returns {boolean}
 */
const isValidDateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
};

module.exports = {
  DEFAULT_TIMEZONE,
  getNowInTimezone,
  getLocalDateString,
  timeToMinutes,
  minutesToTime,
  compareShowtimes,
  isShowInPast,
  calculateEndTime,
  getDynamicDateTabs,
  isValidDateString,
};

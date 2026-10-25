const DEFAULT_TIMEZONE = 'Asia/Kolkata';

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
  parts.forEach((p) => { map[p.type] = p.value; });

  const year = map.year;
  const month = String(map.month).padStart(2, '0');
  const day = String(map.day).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // standard 0-23
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

const isShowInPast = (showDate, startTime, timeZone = DEFAULT_TIMEZONE) => {
  const { dateStr: todayStr, currentMinutes } = getNowInTimezone(timeZone);
  if (showDate < todayStr) return true;
  if (showDate > todayStr) return false;
  // If today: check if showtime minutes is <= current minutes
  const showMins = timeToMinutes(startTime);
  return showMins <= currentMinutes;
};

console.log('Now in IST:', getNowInTimezone());
console.log('10:30 AM minutes:', timeToMinutes('10:30 AM'));
console.log('02:15 PM minutes:', timeToMinutes('02:15 PM'));
console.log('10:00 PM minutes:', timeToMinutes('10:00 PM'));
console.log('Is 2026-10-14 10:30 AM in past?', isShowInPast('2026-10-14', '10:30 AM'));
console.log('Is 2026-10-14 10:00 PM in past?', isShowInPast('2026-10-14', '10:00 PM'));
console.log('Is 2026-10-15 10:30 AM in past?', isShowInPast('2026-10-15', '10:30 AM'));

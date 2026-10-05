const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Explicit IST, fixed punctuation and month labels across Node/browser ICU versions. */
export function adminDateTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read('day').padStart(2, '0')} ${MONTHS[Number(read('month')) - 1]} ${read('year')}, ${read('hour').padStart(2, '0')}:${read('minute').padStart(2, '0')} IST`;
}

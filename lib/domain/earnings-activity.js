/** Full-month receipt cohort, kept in integer paise like the API's monthly totals. */
export function earningsActivity(items, month) {
  const [year, selectedMonth] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, selectedMonth, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, index) => ({
    date: `${month}-${String(index + 1).padStart(2, '0')}`,
    bookedRentMinor: 0n,
    visits: 0,
  }));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  for (const row of items) {
    const date = new Date(row.recordedAt);
    if (!Number.isFinite(date.getTime())) continue;
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map(({ type, value }) => [type, value]),
    );
    if (`${parts.year}-${parts.month}` !== month) continue;
    const day = days[Number(parts.day) - 1];
    if (!day) continue;
    const amount = /^\d+$/.test(String(row.bookedRentMinor)) ? BigInt(row.bookedRentMinor) : 0n;
    day.bookedRentMinor += amount;
    day.visits += 1;
  }
  const max = days.reduce(
    (peak, day) => (day.bookedRentMinor > peak ? day.bookedRentMinor : peak),
    0n,
  );
  return {
    maxMinor: max.toString(),
    days: days.map((day) => ({
      ...day,
      bookedRentMinor: day.bookedRentMinor.toString(),
      height: max ? Number((day.bookedRentMinor * 10000n) / max) / 100 : 0,
    })),
  };
}

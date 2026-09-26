const labels = {
  night: 'Overnight',
  full_day: 'Full day',
  slots: 'Visit slots',
  weekday: 'Weekday rent',
  weekend: 'Weekend rent',
  day_weekday: 'Day weekday rent',
  day_weekend: 'Day weekend rent',
  night_weekday: 'Night weekday rent',
  night_weekend: 'Night weekend rent',
  full_day_weekday: 'Full day weekday rent',
  full_day_weekend: 'Full day weekend rent',
  extraGuestCharge: 'Extra guest charge',
  extraGuestChargeMinor: 'Extra guest charge (paise)',
  depositAmount: 'Separate deposit estimate',
  cancellationTier: 'Cancellation tier',
  capacity: 'Maximum guests',
  includedGuests: 'Included guests',
  startTime: 'Arrival time',
  endTime: 'Departure time',
  endDayOffset: 'Departure day offset',
  bufferBeforeMinutes: 'Buffer before (minutes)',
  bufferAfterMinutes: 'Buffer after (minutes)',
  leadTimeMinutes: 'Minimum notice (minutes)',
  bookingHorizonDays: 'Booking horizon (days)',
  timeZone: 'Time zone',
  enabled: 'Offered',
  day: 'Visit date',
  slot: 'Visit slot',
  rentMinor: 'Rent (paise)',
  rates: 'Base rents',
  from: 'First date',
  to: 'Last date',
};
export default function PolicyValues({ values }) {
  return (
    <ul className="space-y-1 text-sm">
      {Object.entries(values || {})
        .filter(([key]) => !['rentableId', 'extraHourCharge', 'inventoryReady'].includes(key))
        .map(([key, value]) => (
          <li key={key}>
            {labels[key] || key.replaceAll('_', ' ')}:{' '}
            {value && typeof value === 'object' ? (
              <div className="ml-3">
                <PolicyValues values={value} />
              </div>
            ) : value === null ? (
              'Reset to base rate'
            ) : typeof value === 'boolean' ? (
              value ? (
                'Yes'
              ) : (
                'No'
              )
            ) : (
              String(value)
            )}
          </li>
        ))}
    </ul>
  );
}

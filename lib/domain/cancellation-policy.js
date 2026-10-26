/**
 * Story 2.6: the same quick-fill presets as the API (domain/cancellation-policy.js).
 * Only the resulting windows are saved; the API validates them.
 */
const policy = (windows, atOrAfterCheckInPct = 0) => ({
  version: 1,
  windows: windows.map(([hoursBefore, pct]) => ({ hoursBefore, pct })),
  atOrAfterCheckInPct,
  earlyDeparture: { offered: false, pct: 0 },
});

export const CANCELLATION_PRESETS = {
  day: {
    flexible: policy([
      [72, 100],
      [0, 50],
    ]),
    moderate: policy([
      [168, 100],
      [72, 50],
      [0, 0],
    ]),
    strict: policy([
      [168, 50],
      [0, 0],
    ]),
  },
  hour: {
    flexible: policy([
      [4, 100],
      [0, 0],
    ]),
    moderate: policy([
      [24, 100],
      [6, 50],
      [0, 0],
    ]),
    strict: policy([
      [48, 50],
      [0, 0],
    ]),
  },
  night: {
    flexible: policy([
      [24, 100],
      [0, 0],
    ]),
    moderate: policy([
      [72, 100],
      [0, 0],
    ]),
    strict: policy([
      [168, 100],
      [0, 0],
    ]),
    non_refundable: policy([[0, 0]]),
  },
};

export const PRESET_LABELS = {
  flexible: 'Flexible',
  moderate: 'Moderate',
  strict: 'Strict',
  non_refundable: 'Non-refundable',
};

export const presetSet = (rentalUnit) =>
  CANCELLATION_PRESETS[rentalUnit === 'hour' ? 'hour' : rentalUnit === 'night' ? 'night' : 'day'];

export const MAX_WINDOWS = 6;

/** "36 hours" / "3 days" for whole days of 48 hours or more. */
export function hoursLabel(hours) {
  return hours >= 48 && hours % 24 === 0 ? `${hours / 24} days` : `${hours} hours`;
}

/** One plain sentence per window, so owners and guests read the same thing. */
export function describePolicy(p) {
  if (!p?.windows?.length) return [];
  const lines = p.windows.map((w, i) => {
    const until = i === 0 ? null : p.windows[i - 1].hoursBefore;
    const span =
      w.hoursBefore === 0
        ? until == null
          ? 'Before check-in'
          : `Less than ${hoursLabel(until)} before check-in`
        : `More than ${hoursLabel(w.hoursBefore)} before check-in`;
    return `${span}: ${w.pct}% back`;
  });
  lines.push(`At or after check-in: ${p.atOrAfterCheckInPct}% back`);
  if (p.earlyDeparture?.offered)
    lines.push(`Leaving early: ${p.earlyDeparture.pct}% back for nights not stayed`);
  return lines;
}

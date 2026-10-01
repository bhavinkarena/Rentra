/**
 * Duotone tab icons for the verticals, approved by the owner on 1 Oct 2026
 * (docs/design/entertainment/). Brand tokens as literal colours so they also
 * render inside photo heroes. Decorative: callers give the accessible name.
 */
export function FarmhouseIcon({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path d="M3 27h26" stroke="#064e3b" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M6.5 14.2V27h15V14.2L14 8.4z"
        fill="#f8e7c9"
        stroke="#064e3b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 15.5 14 7.2l10 8.3"
        fill="none"
        stroke="#064e3b"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="11.6" y="18.6" width="4.8" height="8.4" rx="1" fill="#064e3b" />
      <circle cx="25.4" cy="15.8" r="4.6" fill="#609a7d" />
      <circle cx="24" cy="14.4" r="1.6" fill="#8dbca4" />
      <rect x="24.7" y="19.5" width="1.5" height="7.5" rx=".6" fill="#043d2e" />
    </svg>
  );
}

export function EntertainmentIcon({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-38 15 15)">
        <rect
          x="11.6"
          y="9.5"
          width="7"
          height="17"
          rx="2.6"
          fill="#f3c77e"
          stroke="#a6640f"
          strokeWidth="1.4"
        />
        <path
          d="M15.1 12.5v11"
          stroke="#a6640f"
          strokeWidth=".9"
          strokeLinecap="round"
          opacity=".6"
        />
        <rect x="14.1" y="2.5" width="2" height="7.6" rx="1" fill="#064e3b" />
      </g>
      <circle cx="24.2" cy="24.2" r="4.3" fill="#b42318" />
      <path
        d="M21.7 22.3c1.4 1.1 1.7 2.9 1 4.4M26.7 22.1c-1.3 1-1.6 2.8-1 4.3"
        stroke="#fef3f2"
        strokeWidth=".9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BY_CODE = { farmhouse: FarmhouseIcon, entertainment: EntertainmentIcon };

/** The icon for a vertical code; farmhouse for unknown codes. */
export function VerticalIcon({ code, className }) {
  const Icon = BY_CODE[code] ?? FarmhouseIcon;
  return <Icon className={className} />;
}

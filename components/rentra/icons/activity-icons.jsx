/**
 * 24px line icons for entertainment activities, keyed by category.icon_key.
 * currentColor, so they follow text colour. Unknown keys get a generic ball.
 */
const PATHS = {
  cricket: (
    <>
      <path d="m14.5 4.5 5 5-9.2 9.2a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8z" />
      <path d="m17 2 5 5" />
      <circle cx="5.5" cy="5.5" r="2.5" />
    </>
  ),
  pickleball: (
    <>
      <rect x="3" y="3" width="11" height="12" rx="5.5" transform="rotate(-30 8.5 9)" />
      <path d="m11.5 14.5 3.5 6" />
      <circle cx="18.5" cy="6" r="2.6" />
    </>
  ),
  badminton: (
    <>
      <path d="M9 21a3 3 0 0 0 6 0z" />
      <path d="M9.6 18 6 4l6 3 6-3-3.6 14" />
      <path d="M12 7v11M8.4 11.5h7.2" />
    </>
  ),
  bowling: (
    <>
      <circle cx="8" cy="15" r="6" />
      <path d="M17.5 3c-1.4 0-2 1.2-1.6 2.6l.4 1.4c-1.6 1.4-2 3.6-1.3 6.2.6 2.3.6 4.6 0 6.8h5c-.6-2.2-.6-4.5 0-6.8.7-2.6.3-4.8-1.3-6.2l.4-1.4C19.5 4.2 18.9 3 17.5 3z" />
    </>
  ),
  football: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 3.4 2.5-1.3 4H9.9l-1.3-4z" />
      <path d="M12 3v4.5M15.4 10l4.8-1.6M14.1 14l2.9 4.2M9.9 14 7 18.2M8.6 10 3.8 8.4" />
    </>
  ),
  gaming: (
    <>
      <path d="M6.5 8h11a4 4 0 0 1 3.9 4.9l-1 4.3a2.6 2.6 0 0 1-4.4 1.2L14 16.5h-4L8 18.4a2.6 2.6 0 0 1-4.4-1.2l-1-4.3A4 4 0 0 1 6.5 8z" />
      <path d="M7.5 11v3M6 12.5h3" />
    </>
  ),
  trampoline: (
    <>
      <ellipse cx="12" cy="16" rx="9" ry="2.6" />
      <path d="M5 17.8 4 21M19 17.8l1 3M12 18.6V21" />
      <circle cx="12" cy="4" r="1.8" />
      <path d="M12 6v4.5M9 8.2 12 7l3 1.2" />
    </>
  ),
  kart: (
    <>
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M3.5 17H2v-3l3-1h6l2-4h3l1.5 4H21l1 3h-1.5M8.5 17h7" />
    </>
  ),
};

export function ActivityIcon({ iconKey, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[iconKey] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

// Hotel mockups (Phase 1). Copied from the Entertainment draft icons, plus hotel icons. Tab icons are duotone 32px; others are 24px line icons in currentColor.
const S = (vb, body, extra = '') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;
const L = (body) => S('0 0 24 24', body, 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"');
window.ICONS = {
  'tab-farmhouse': S('0 0 32 32', `
    <path d="M3 27h26" stroke="#064e3b" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6.5 14.2V27h15V14.2L14 8.4z" fill="#f8e7c9" stroke="#064e3b" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M4 15.5 14 7.2l10 8.3" fill="none" stroke="#064e3b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="11.6" y="18.6" width="4.8" height="8.4" rx="1" fill="#064e3b"/>
    <circle cx="25.4" cy="15.8" r="4.6" fill="#609a7d"/><circle cx="24" cy="14.4" r="1.6" fill="#8dbca4"/>
    <rect x="24.7" y="19.5" width="1.5" height="7.5" rx=".6" fill="#043d2e"/>`),
  'tab-entertainment': S('0 0 32 32', `
    <g transform="rotate(-38 15 15)"><rect x="11.6" y="9.5" width="7" height="17" rx="2.6" fill="#f3c77e" stroke="#a6640f" stroke-width="1.4"/>
    <path d="M15.1 12.5v11" stroke="#a6640f" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
    <rect x="14.1" y="2.5" width="2" height="7.6" rx="1" fill="#064e3b"/></g>
    <circle cx="24.2" cy="24.2" r="4.3" fill="#b42318"/>
    <path d="M21.7 22.3c1.4 1.1 1.7 2.9 1 4.4M26.7 22.1c-1.3 1-1.6 2.8-1 4.3" stroke="#fef3f2" stroke-width=".9" fill="none" stroke-linecap="round"/>`),
  cricket: L(`<path d="m14.5 4.5 5 5-9.2 9.2a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8z"/><path d="m17 2 5 5"/><circle cx="5.5" cy="5.5" r="2.5"/>`),
  pickleball: L(`<rect x="3" y="3" width="11" height="12" rx="5.5" transform="rotate(-30 8.5 9)"/><path d="m11.5 14.5 3.5 6"/><circle cx="18.5" cy="6" r="2.6"/><path d="M18 5.4h.01M19.2 6.6h.01"/>`),
  badminton: L(`<path d="M9 21a3 3 0 0 0 6 0z"/><path d="M9.6 18 6 4l6 3 6-3-3.6 14"/><path d="M12 7v11M8.4 11.5h7.2"/>`),
  bowling: L(`<circle cx="8" cy="15" r="6"/><path d="M6.5 12.5h.01M9 11.5h.01M8.5 14h.01"/><path d="M17.5 3c-1.4 0-2 1.2-1.6 2.6l.4 1.4c-1.6 1.4-2 3.6-1.3 6.2.6 2.3.6 4.6 0 6.8h5c-.6-2.2-.6-4.5 0-6.8.7-2.6.3-4.8-1.3-6.2l.4-1.4C19.5 4.2 18.9 3 17.5 3z"/>`),
  football: L(`<circle cx="12" cy="12" r="9"/><path d="m12 7.5 3.4 2.5-1.3 4H9.9l-1.3-4z"/><path d="M12 3v4.5M15.4 10l4.8-1.6M14.1 14l2.9 4.2M9.9 14 7 18.2M8.6 10 3.8 8.4"/>`),
  gaming: L(`<path d="M6.5 8h11a4 4 0 0 1 3.9 4.9l-1 4.3a2.6 2.6 0 0 1-4.4 1.2L14 16.5h-4L8 18.4a2.6 2.6 0 0 1-4.4-1.2l-1-4.3A4 4 0 0 1 6.5 8z"/><path d="M7.5 11v3M6 12.5h3"/><path d="M15.5 12h.01M17.5 13.5h.01"/>`),
  trampoline: L(`<ellipse cx="12" cy="16" rx="9" ry="2.6"/><path d="M5 17.8 4 21M19 17.8l1 3M12 18.6V21"/><circle cx="12" cy="4" r="1.8"/><path d="M12 6v4.5M9 8.2 12 7l3 1.2M10 13l2-2.5 2 2.5"/>`),
  kart: L(`<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M3.5 17H2v-3l3-1h6l2-4h3l1.5 4H21l1 3h-1.5M8.5 17h7"/><path d="M12.5 9l-1-3h-2"/>`),
  search: L(`<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`),
  heart: L(`<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>`),
  bookings: L(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`),
  compass: L(`<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>`),
  bolt: L(`<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>`),
  rupee: L(`<path d="M7 5h10M7 9h10M8 5c5 0 6 8 0 8h-1l7 6"/>`),
  shield: L(`<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>`),
  clock: L(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  users: L(`<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>`),
  grid: L(`<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>`),
  sun: L(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  home: L(`<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>`),
  pin: L(`<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>`),
  star: S('0 0 24 24', `<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" fill="#d98a1f"/>`),
  chevron: L(`<path d="m6 9 6 6 6-6"/>`),
  check: L(`<path d="m5 12 4.5 4.5L19 7"/>`),
  floodlight: L(`<path d="M6 21V9M6 9l-2-5h8l-2 5z"/><path d="M14 6l3-1M14 9h3.5M14 12l3 1"/>`),
  parking: L(`<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>`),
  shirt: L(`<path d="m8 3-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>`),
  water: L(`<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>`),
  minus: L(`<path d="M5 12h14"/>`), plus: L(`<path d="M12 5v14M5 12h14"/>`),
};
Object.assign(window.ICONS, {
  'tab-hotel': S('0 0 32 32', `
    <path d="M3 27h26" stroke="#064e3b" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="8" y="6" width="16" height="21" rx="1.6" fill="#f8e7c9" stroke="#064e3b" stroke-width="1.6"/>
    <path d="M6 7.2 16 3l10 4.2" fill="none" stroke="#064e3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="11" y="10" width="3" height="3" rx=".6" fill="#609a7d"/><rect x="18" y="10" width="3" height="3" rx=".6" fill="#609a7d"/>
    <rect x="11" y="15.5" width="3" height="3" rx=".6" fill="#609a7d"/><rect x="18" y="15.5" width="3" height="3" rx=".6" fill="#d98a1f"/>
    <rect x="13.8" y="21" width="4.4" height="6" rx=".8" fill="#064e3b"/>`),
  bed: L(`<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>`),
  ruler: L(`<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v3M11 7v4M15 7v3M19 7v4"/>`),
  window: L(`<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/>`),
  wifi: L(`<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>`),
  coffee: L(`<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>`),
  snow: L(`<path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5 4.2 17.5"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>`),
  pool: L(`<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M8 14V5a2 2 0 0 1 4 0M16 14V5a2 2 0 0 0-4 0M8 8h8M8 11h8"/>`),
  couple: L(`<circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M10.5 20a5.5 5.5 0 0 1 11 0"/>`),
  idcard: L(`<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0M14 10h4M14 13h3"/>`),
  calendar: L(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`),
  key: L(`<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14.5 8.5l2 2"/>`),
  user: L(`<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`),
  wallet: L(`<path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3"/><path d="M16 13.5h.01"/>`),
  chart: L(`<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`),
  bell: L(`<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>`),
  sliders: L(`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>`),
  sort: L(`<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>`),
  map: L(`<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>`),
  list: L(`<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`),
  share: L(`<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>`),
  alert: L(`<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>`),
  info: L(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>`),
  lock: L(`<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`),
  phone: L(`<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>`),
  download: L(`<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>`),
  building: L(`<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>`),
  doc: L(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>`),
  x: L(`<path d="M6 6l12 12M18 6 6 18"/>`),
  back: L(`<path d="M15 6l-6 6 6 6"/>`),
  next: L(`<path d="m9 6 6 6-6 6"/>`),
  edit: L(`<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>`),
  clipboard: L(`<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>`),
  settings: L(`<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>`),
  lifebuoy: L(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>`),
  utensils: L(`<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1-4 3.5-4 7v3h4"/>`),
  leaf: L(`<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>`),
  dumbbell: L(`<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>`),
  plug: L(`<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>`),
  concierge: L(`<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4"/>`),
  car: L(`<path d="M5 17h14M3 13l2-6h14l2 6v4h-2M3 13v4h2M3 13h18"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>`),
  tag: L(`<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 7.5h.01"/>`),
  camera: L(`<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>`),
  moon: L(`<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>`),
  refresh: L(`<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9M4 13a8 8 0 0 0 14.6 4.5L21 15"/><path d="M3 4v5h5M21 20v-5h-5"/>`),
  door: L(`<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><path d="M15 12h.01"/>`),
  logout: L(`<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"/>`),
  scale: L(`<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>`),
  'star-o': L(`<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>`),
  upload: L(`<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>`),
  whatsapp: L(`<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>`),
});
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = window.ICONS[el.dataset.icon] || ''; el.classList.add('ic'); });

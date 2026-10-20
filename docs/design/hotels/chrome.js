// Shared chrome for the Phase 1 hotel mockups. Runs before icons.js.
// <body data-shell="customer|owner|admin" data-vertical="hotel" data-nav="today"> + #hdr / #ftr / #side placeholders.
(function () {
  const b = document.body;
  const q = new URLSearchParams(location.search);
  if (q.get('state')) b.dataset.state = q.get('state');
  if (q.get('docked') === '1') b.classList.add('docked');

  // Prototype bar: every screen links back to the index and to its sibling states.
  const states = (b.dataset.states || '').split(',').filter(Boolean);
  const bar = document.createElement('div');
  bar.className = 'proto';
  bar.innerHTML = `<a href="index.html">← All screens</a><span>${document.title.replace('Hotels mock · ', '')}</span>` +
    (states.length ? `<span class="st">${states.map((s) => {
      const [key, label] = s.split(':');
      const on = (b.dataset.state || states[0].split(':')[0]) === key;
      return `<a href="?state=${key}" ${on ? 'aria-current="true"' : ''}>${label || key}</a>`;
    }).join('')}</span>` : '');
  b.prepend(bar);

  // State switching: [data-show="a b"] appears only in those states; [data-hide="a"] disappears in them.
  const state = b.dataset.state || (states[0] || '').split(':')[0];
  b.dataset.state = state;
  document.querySelectorAll('[data-show]').forEach((el) => { if (el.dataset.show.split(' ').includes(state)) el.removeAttribute('data-show'); });
  document.querySelectorAll('[data-hide]').forEach((el) => { if (el.dataset.hide.split(' ').includes(state)) el.remove(); });

  const hdr = document.getElementById('hdr');
  if (hdr) {
    const active = b.dataset.vertical;
    const tab = (code, label, href) => `<li><a href="${href}" ${active === code ? 'aria-current="page"' : ''}><i data-icon="tab-${code}"></i>${label}</a></li>`;
    hdr.outerHTML = `
    <header class="hdr"><div class="wrap">
      <a class="logo" href="home.html"><img src="../../../public/brand/rentra-lockup.svg" alt="Rentra"></a>
      ${b.dataset.tabs === 'off' ? '<span style="flex:1"></span>' : `<nav aria-label="Categories"><ul class="tabs">${tab('farmhouse', 'Farmhouse', '#')}${tab('entertainment', 'Entertainment', '#')}${tab('hotel', 'Hotels', 'home.html')}</ul></nav>`}
      <div class="pill" role="group" aria-label="Search">${b.dataset.pill || ''}<b class="go"><i data-icon="search"></i></b></div>
      <nav class="nav" aria-label="Main"><a class="on" href="home.html"><i data-icon="compass"></i><span class="lbl">Explore</span></a><a href="#"><i data-icon="heart"></i><span class="lbl">Saved</span></a><a href="trip.html"><i data-icon="bookings"></i><span class="lbl">Bookings</span></a></nav>
      <a class="list-link" href="owner-onboarding.html">List your hotel</a>
    </div></header>`;
  }

  const ftr = document.getElementById('ftr');
  if (ftr) ftr.outerHTML = `<footer><div class="wrap"><div class="cols">
    <div><img src="../../../public/brand/rentra-mark.svg" alt="Rentra" style="height:30px;filter:brightness(0) invert(1)"><p style="margin-top:10px">Farmhouses, play venues and hotels across Gujarat.</p></div>
    <div><b>Hotels near you</b><p>Surat<br>Ahmedabad<br>Vadodara<br>Rajkot</p></div>
    <div><b>Popular stays</b><p>Couple-friendly in Surat<br>Near Surat Railway Station<br>Resorts near Saputara<br>Business hotels in Ahmedabad</p></div>
    <div><b>Own a hotel?</b><p><a href="owner-onboarding.html" style="color:inherit">List your hotel</a><br>Owner help</p></div></div>
    <p class="legal">Rentra is an intermediary and is not the owner, lessor or operator of listed places.</p></div></footer>`;

  // Owner / admin portal shell: deep emerald sidebar + top bar + phone bottom bar.
  const side = document.getElementById('side');
  if (side) {
    const owner = b.dataset.shell === 'owner';
    const items = owner
      ? [['today', 'sun', 'Today', 'owner-today.html'], ['calendar', 'calendar', 'Rates & rooms', 'owner-rates.html'], ['bookings', 'clipboard', 'Bookings', 'owner-bookings.html'],
        ['property', 'building', 'Property', 'owner-onboarding.html'], ['reviews', 'star-o', 'Reviews', '#'], ['earnings', 'wallet', 'Earnings', 'owner-earnings.html'],
        ['team', 'users', 'Team', '#'], ['help', 'lifebuoy', 'Help', '#'], ['settings', 'settings', 'Settings', '#']]
      : [['overview', 'grid', 'Overview', '#'], ['applications', 'doc', 'Applications', 'admin-approvals.html'], ['properties', 'building', 'Properties', '#'],
        ['bookings', 'clipboard', 'Bookings', '#'], ['finance', 'wallet', 'Finance', '#'], ['commission', 'tag', 'Commission', 'admin-commission.html'],
        ['disputes', 'scale', 'Disputes', '#'], ['people', 'users', 'People', '#'], ['settings', 'settings', 'Settings', '#']];
    const nav = items.map(([k, ic, l, h]) => `<a href="${h}" ${b.dataset.nav === k ? 'aria-current="page"' : ''}><i data-icon="${ic}"></i><span>${l}</span></a>`).join('');
    side.outerHTML = `<aside class="side"><a class="slogo" href="index.html"><img src="../../../public/brand/rentra-mark.svg" alt=""><span>Rentra ${owner ? 'Owner' : 'Admin'}</span></a>
      ${owner ? '<button class="propsw"><span class="thumb"></span><span><b>Riverside Residency</b><i>Adajan, Surat · 32 rooms</i></span><i data-icon="chevron"></i></button>' : ''}
      <nav aria-label="Workspace">${nav}</nav></aside>
      <nav class="pbar" aria-label="Workspace">${items.slice(0, 4).map(([k, ic, l, h]) => `<a href="${h}" ${b.dataset.nav === k ? 'aria-current="page"' : ''}><i data-icon="${ic}"></i>${l.split(' ')[0]}</a>`).join('')}<a href="#"><i data-icon="list"></i>More</a></nav>`;
  }
})();

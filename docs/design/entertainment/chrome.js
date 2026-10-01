// Shared header/footer for the review mockups. ?docked=1 shows the docked-search state.
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('docked') === '1') document.body.classList.add('docked');
  const active = document.body.dataset.vertical;
  const tabs = document.body.dataset.tabs !== 'off';
  const tab = (code, label, href) => `<li><a href="${href}" ${active === code ? 'aria-current="page"' : ''}><i data-icon="tab-${code}"></i>${label}</a></li>`;
  document.getElementById('hdr').outerHTML = `
  <header class="hdr"><div class="wrap">
    <a class="logo" href="#"><img src="../../../public/brand/rentra-lockup.svg" alt="Rentra"></a>
    ${tabs ? `<nav aria-label="Categories"><ul class="tabs">${tab('farmhouse', 'Farmhouse', 'farmhouse-header.html')}${tab('entertainment', 'Entertainment', 'entertainment-home.html')}</ul></nav>` : ''}
    <div class="pill" role="group" aria-label="Search">${document.body.dataset.pill || ''}<b class="go"><i data-icon="search"></i></b></div>
    <nav class="nav" aria-label="Main"><a class="on" href="#"><i data-icon="compass"></i><span class="lbl">Explore</span></a><a href="#"><i data-icon="heart"></i><span class="lbl">Saved</span></a><a href="#"><i data-icon="bookings"></i><span class="lbl">Bookings</span></a></nav>
    <span class="list-link">List your place</span>
  </div></header>`;
  const f = document.getElementById('ftr');
  if (f) f.outerHTML = `<footer><div class="wrap"><div class="cols">
    <div><img src="../../../public/brand/rentra-lockup-inverse.svg" alt="Rentra" style="height:26px"><p style="margin-top:10px">Farmhouses and play venues across Gujarat.</p></div>
    <div><b>Farmhouses near you</b><p>Surat<br>Ahmedabad<br>Vadodara<br>Rajkot</p></div>
    <div><b>Play near you</b><p>Box cricket in Surat<br>Pickleball in Surat<br>Bowling in Ahmedabad<br>Turfs in Vadodara</p></div>
    <div><b>Have a place to share?</b><p>List a farmhouse<br>List a venue</p></div></div>
    <p class="legal">Rentra is an intermediary and is not the owner, lessor or operator of listed places.</p></div></footer>`;
})();

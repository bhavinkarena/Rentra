const { getLiveListings, getListingsNearby, getListingBySlug, getAvailability, countLiveInArea } =
  await import('../lib/db/queries.js');

const live = await getLiveListings({ limit: 10 });
console.log(`getLiveListings → ${live.length}`);
for (const l of live) {
  console.log(`  ${l.area.padEnd(20)} ₹${String(l.price).padStart(6)}/${l.unit}  ★${l.rating || '-'} (${l.reviewCount})  badge=${l.badge ?? '-'}`);
}

// Surat city centre → 25 km radius, index-backed PostGIS query
const near = await getListingsNearby({ lng: 72.8311, lat: 21.1702, km: 30 });
console.log(`\ngetListingsNearby (30km of Surat) → ${near.length}`);
for (const n of near) console.log(`  ${n.area.padEnd(20)} ${n.distanceKm} km`);

const detail = await getListingBySlug('riverside-farm-with-private-pool');
console.log(`\ngetListingBySlug → ${detail.title}`);
console.log('  prices:', detail.prices);
console.log('  amenities:', detail.amenities.length, '| rules:', detail.houseRules.length);
console.log('  client:', detail.client.name, `${Math.round(detail.client.responseRate * 100)}% · under ${Math.round(detail.client.respondsWithinMins / 60)}h`);
console.log('  reviews:', detail.reviews.length, detail.reviews[0] ? `→ "${detail.reviews[0].body.slice(0, 44)}..."` : '');

const from = new Date().toISOString().slice(0, 10);
const toD = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
const avail = await getAvailability({ rentableId: detail.id, from, to: toD });
console.log(`\ngetAvailability (7 days) → ${avail.length} rows`);
console.log('  open:', avail.filter((a) => a.unitsAvailable > 0).length, '| blocked:', avail.filter((a) => a.unitsAvailable === 0).length);

console.log('\ncountLiveInArea kamrej →', await countLiveInArea({ citySlug: 'surat', areaSlug: 'kamrej' }), '(thin-page guard needs >= 3)');
process.exit(0);

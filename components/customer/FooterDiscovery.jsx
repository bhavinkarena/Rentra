'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { INTENTS } from '@/lib/constants';
import styles from './CustomerShell.module.css';

export default function FooterDiscovery({ cities, categories }) {
  const [selected, setSelected] = useState(cities[0].slug);
  const farmhouse = categories.some((category) => category.slug === 'farmhouse');
  return (
    <section className={styles.discovery} aria-labelledby="footer-explore-heading">
      <div className={styles.discoveryTop}>
        <h3 id="footer-explore-heading">A good day, closer to home.</h3>
        <label className={styles.cityPicker} htmlFor="footer-city">
          Explore around
          <select
            id="footer-city"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Retain every destination in the server HTML; only one city's links are visible. */}
      {cities.map((city) => (
        <div key={city.slug} hidden={selected !== city.slug}>
          <nav aria-label={`Places in ${city.name}`}>
            <ul className={styles.destinationLinks}>
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/${city.slug}/${category.slug}`}
                    aria-label={`${category.slug === 'farmhouse' ? 'All farmhouses' : category.name} in ${city.name}`}
                  >
                    {category.slug === 'farmhouse' ? 'All farmhouses' : category.name}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {farmhouse &&
                INTENTS.map((intent) => (
                  <li key={intent.slug}>
                    <Link
                      href={`/${city.slug}/farmhouse/intent/${intent.slug}`}
                      aria-label={`${intent.label} in ${city.name}`}
                    >
                      {intent.label}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      ))}
    </section>
  );
}

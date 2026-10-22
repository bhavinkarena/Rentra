'use client';

import { BriefcaseBusiness, Heart, Users, Waves } from 'lucide-react';
import OccasionPicker from '@/components/rentra/OccasionPicker';
import photos from './inspiration.json';

const STAYS = [
  {
    id: 'weekend',
    label: 'Weekend escape',
    Icon: Waves,
    title: 'A little less rush.\nA little more pool.',
    text: 'Trade the everyday for a change of scene. Find a hotel with a pool and make room to do nothing.',
    detail: 'Check each hotel’s pool timings and access rules.',
    action: 'Explore poolside stays',
    query: 'amenities=swimming_pool',
  },
  {
    id: 'work',
    label: 'Work trip',
    Icon: BriefcaseBusiness,
    title: 'Check in.\nSwitch gears.',
    text: 'A place to catch up, recharge and get a good night’s sleep. Start with stays that list Wi-Fi.',
    detail: 'Check room facilities and the location before choosing.',
    action: 'Find stays for work',
    query: 'amenities=wifi',
  },
  {
    id: 'couple',
    label: 'Just the two of you',
    Icon: Heart,
    title: 'Good company.\nA great little escape.',
    text: 'Take a break together. Explore hotels that welcome unmarried couples with valid ID.',
    detail: 'Carry ID for both guests and review the hotel’s policies.',
    action: 'Explore couple-friendly stays',
    query: 'couples=1',
  },
  {
    id: 'family',
    label: 'Together time',
    Icon: Users,
    title: 'Bring your people.\nMake a memory.',
    text: 'Turn a catch-up into a getaway. Start with two rooms for four adults, then make the trip your own.',
    detail: 'Add children’s ages in search to check room occupancy.',
    action: 'Plan a stay together',
    query: 'rooms=2&adults=4',
  },
];

const HOTEL_STAYS = STAYS.map((stay) => ({
  ...stay,
  slug: stay.id,
  image: photos[stay.id].src,
  alt: photos[stay.id].alt,
  credit: photos[stay.id].hotel,
  source: photos[stay.id].source,
  tint: {
    weekend: 'bg-accent',
    work: 'bg-secondary',
    couple: 'bg-champagne-subtle',
    family: 'bg-accent',
  }[stay.id],
}));

export default function StayPicker({ cities }) {
  return <OccasionPicker cities={cities} stays={HOTEL_STAYS} />;
}

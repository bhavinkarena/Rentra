import { createSlice } from '@reduxjs/toolkit';

/**
 * CLIENT UI STATE ONLY.
 *
 * What lives here: the state of the search/filter controls, the map-vs-list
 * toggle, the booking wizard step, form drafts. Things that are interactive,
 * ephemeral, and shared between sibling client components.
 *
 * What must NEVER live here: listing data, search results, availability,
 * prices. Those are fetched in Server Components so Google can read them.
 * Putting listings in Redux would move rendering to the client and cost you
 * the SEO that Next.js was chosen for in the first place.
 */
const initialState = {
  city: '',
  area: '',
  date: '',
  slot: 'day',
  guests: 2,
  priceMin: null,
  priceMax: null,
  amenities: [],
  view: 'list', // 'list' | 'map'
  sort: 'recent',
  filtersOpen: false,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setField: (state, action) => {
      const { field, value } = action.payload;
      if (field in state) state[field] = value;
    },
    setSlot: (state, action) => {
      state.slot = action.payload;
    },
    toggleAmenity: (state, action) => {
      const id = action.payload;
      state.amenities = state.amenities.includes(id)
        ? state.amenities.filter((a) => a !== id)
        : [...state.amenities, id];
    },
    setView: (state, action) => {
      state.view = action.payload;
    },
    toggleFilters: (state) => {
      state.filtersOpen = !state.filtersOpen;
    },
    hydrateFromUrl: (state, action) => ({ ...state, ...action.payload }),
    resetFilters: () => initialState,
  },
});

export const {
  setField,
  setSlot,
  toggleAmenity,
  setView,
  toggleFilters,
  hydrateFromUrl,
  resetFilters,
} = searchSlice.actions;

export const selectSearch = (s) => s.search;
export const selectActiveFilterCount = (s) =>
  [
    s.search.priceMin != null || s.search.priceMax != null,
    s.search.amenities.length > 0,
    s.search.guests > 2,
  ].filter(Boolean).length;

export default searchSlice.reducer;

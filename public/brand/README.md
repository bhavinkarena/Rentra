# Rentra brand assets

| File                        | Use                                                             |
| --------------------------- | --------------------------------------------------------------- |
| `rentra-lockup.svg`         | Mark + wordmark, for light grounds. The default.                |
| `rentra-lockup-inverse.svg` | Same artwork for dark grounds (ink-900 and darker).             |
| `rentra-mark.svg`           | Mark alone, for squares — avatars, app icons, favicons, stamps. |

These are for anything **outside** the app: email, invoices, decks, PDFs, a
partner's own site. Inside the app use `components/rentra/Logo.jsx`, which
draws the same artwork inline so it can be recoloured per surface and cannot
flash in after paint.

> The component holds its own copy of the path data. It is the same artwork —
> if the logo is ever redrawn, both have to be replaced together.

## Rules

- **Size by height, never width.** The lockup is 3.66:1; setting a width fights
  the viewBox. In the app that means `h-7` / `h-9`, not `w-32`.
- **Light grounds get the colour lockup, ink-900 gets `inverse`.** The delivered
  deep green (`#1F5C41`) goes muddy on dark chrome, so the inverse swaps the
  mark to brand-200 / brand-400 with a white wordmark.
- **Under ~20px, drop to the mark.** The wordmark stops being legible before the
  mark stops being recognisable — this is why the mobile header shows the mark
  alone below `sm`.
- **Clear space:** at least the height of the mark's counter (~25% of the
  lockup height) on every side.

## What was changed from the delivered files

Artwork untouched, canvas and proportion corrected:

- The canvas was cropped to the measured ink bounds. The delivered lockup sat
  in a 430x140 box with 17% dead space on the right and 20 units of it under
  the baseline, so it rendered small and hung high-left whenever it was
  vertically centred in a row.
- The wordmark was enlarged from 40% to 52% of the mark's height — the usual
  proportion for a horizontal lockup. At 40% the name read as a caption next
  to the mark rather than as part of it.

## Related

- `app/icon.svg` — favicon, the mark on its delivered 200x200 box.
- `app/apple-icon.js` — iOS home-screen icon, the mark on a brand-50 tile.
  Opaque on purpose: iOS composites a transparent icon onto black.
- `app/opengraph-image.js` — the share card, built from `rentra-lockup.svg`
  plus the `.ttf` files in `/assets/fonts`. Those exist because next/font
  self-hosts Plus Jakarta Sans as `.woff2`, which satori cannot parse.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * The card every WhatsApp forward and Google result renders. It is generated
 * from the same lockup the header uses rather than a hand-exported PNG, so the
 * brand cannot drift between the site and the share preview.
 *
 * Statically generated at build time — nothing here reads a request.
 */
export const alt = 'Rentra — book a verified farmhouse, directly from the owner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  /**
   * Satori has no filesystem and no system fonts, so the artwork has to be
   * inlined and the typeface handed over as bytes.
   *
   * The .ttf files are committed under /assets/fonts on purpose. next/font
   * self-hosts Plus Jakarta Sans as .woff2, which satori cannot parse, and
   * fetching from Google at build time would make the build need the network.
   * Without them this falls back to the face bundled with next/og, which
   * renders the brand name in the wrong typeface with ragged word spacing.
   *
   * Every path below is a literal on purpose. Building one from a variable
   * defeats Turbopack's static analysis, and it then traces the whole project
   * — public/seed's photographs included — into the serverless bundle.
   */
  const [lockup, medium, bold] = await Promise.all([
    readFile(join(process.cwd(), 'public/brand/rentra-lockup.svg'), 'utf8'),
    readFile(join(process.cwd(), 'assets/fonts/PlusJakartaSans-500.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/PlusJakartaSans-700.ttf')),
  ]);
  const lockupSrc = `data:image/svg+xml;base64,${Buffer.from(lockup).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        <div style={{ display: 'flex', padding: '76px 80px 0' }}>
          {/* Both dimensions are required — satori infers neither. 337x92
              keeps the lockup's 3.66:1 ratio; recompute if the art changes. */}
          <img src={lockupSrc} width={337} height={92} alt="" />
        </div>

        {/* `marginTop: auto` drops the headline to the foot of the card, so the
            slack collects in one deliberate gap under the logo instead of
            being split above and below the type. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 80px',
            marginTop: 'auto',
            marginBottom: 62,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.14,
              color: '#171A18',
              maxWidth: 940,
            }}
          >
            Book a verified farmhouse, directly from the owner
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 29,
              fontWeight: 500,
              color: '#5A635D',
              marginTop: 30,
            }}
          >
            Verified in person · Money held until check-in · Zero brokerage
          </div>
        </div>

        {/* brand-600, the primary-action green, as the one branded edge. */}
        <div style={{ display: 'flex', height: 14, backgroundColor: '#2E6449' }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Plus Jakarta Sans', data: medium, weight: 500, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}

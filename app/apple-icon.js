import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * iOS home-screen icon. Generated rather than shipped as a PNG so it stays in
 * step with the mark, and given an opaque ground on purpose: iOS composites a
 * transparent apple-touch-icon onto black, which would bury the deep green.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const mark = await readFile(join(process.cwd(), 'public/brand/rentra-mark.svg'), 'utf8');
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F1F7F3', // brand-50, the tinted-surface token
        }}
      >
        <img src={markSrc} width={132} height={132} alt="" />
      </div>
    ),
    size,
  );
}

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple touch icon — 180x180 placeholder.
 * Replace with a real icon asset when branding is finalised.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#3b82f6',
          borderRadius: '36px',
          color: '#ffffff',
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: '-2px',
          fontFamily: 'sans-serif',
        }}
      >
        JQ
      </div>
    ),
    { ...size },
  );
}

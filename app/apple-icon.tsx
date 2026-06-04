import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#6366f1',
          borderRadius: 36,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', width: 146, height: 146 }}>
          {/* Briefcase handle */}
          <div
            style={{
              position: 'absolute',
              left: 28,
              top: 6,
              width: 51,
              height: 28,
              borderTop: '8px solid white',
              borderLeft: '8px solid white',
              borderRight: '8px solid white',
              borderRadius: '17px 17px 0 0',
            }}
          />
          {/* Briefcase body */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 28,
              width: 84,
              height: 62,
              background: 'white',
              borderRadius: 9,
            }}
          />
          {/* Magnifying glass circle */}
          <div
            style={{
              position: 'absolute',
              left: 68,
              top: 68,
              width: 68,
              height: 68,
              borderRadius: '50%',
              border: '8px solid white',
              background: 'rgba(255,255,255,0.18)',
              boxSizing: 'border-box',
            }}
          />
          {/* Magnifying glass handle */}
          <div
            style={{
              position: 'absolute',
              left: 118,
              top: 118,
              width: 11,
              height: 28,
              background: 'white',
              borderRadius: 6,
              transform: 'rotate(45deg)',
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

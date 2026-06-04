import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#6366f1',
          borderRadius: 5,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', width: 26, height: 26 }}>
          {/* Briefcase handle */}
          <div
            style={{
              position: 'absolute',
              left: 5,
              top: 1,
              width: 9,
              height: 5,
              borderTop: '1.5px solid white',
              borderLeft: '1.5px solid white',
              borderRight: '1.5px solid white',
              borderRadius: '3px 3px 0 0',
            }}
          />
          {/* Briefcase body */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 5,
              width: 15,
              height: 11,
              background: 'white',
              borderRadius: 2,
            }}
          />
          {/* Magnifying glass circle */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '1.5px solid white',
              background: 'rgba(255,255,255,0.18)',
              boxSizing: 'border-box',
            }}
          />
          {/* Magnifying glass handle */}
          <div
            style={{
              position: 'absolute',
              left: 21,
              top: 21,
              width: 2,
              height: 5,
              background: 'white',
              borderRadius: 1,
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

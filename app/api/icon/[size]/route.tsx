import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const ALLOWED = new Set(['192', '512']);

function r(n: number) {
  return Math.round(n);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!ALLOWED.has(size)) return new Response('Not Found', { status: 404 });

  const dim = parseInt(size, 10);
  const u = dim / 32; // scale unit relative to 32px baseline
  const inner = r(26 * u);
  const br = r(dim * 0.18);
  const sw = r(1.5 * u);

  return new ImageResponse(
    (
      <div
        style={{
          width: dim,
          height: dim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#6366f1',
          borderRadius: br,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', width: inner, height: inner }}>
          {/* Briefcase handle */}
          <div
            style={{
              position: 'absolute',
              left: r(5 * u),
              top: r(1 * u),
              width: r(9 * u),
              height: r(5 * u),
              borderTop: `${sw}px solid white`,
              borderLeft: `${sw}px solid white`,
              borderRight: `${sw}px solid white`,
              borderRadius: `${r(2.5 * u)}px ${r(2.5 * u)}px 0 0`,
            }}
          />
          {/* Briefcase body */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: r(5 * u),
              width: r(15 * u),
              height: r(11 * u),
              background: 'white',
              borderRadius: r(2 * u),
            }}
          />
          {/* Magnifying glass circle */}
          <div
            style={{
              position: 'absolute',
              left: r(12 * u),
              top: r(12 * u),
              width: r(12 * u),
              height: r(12 * u),
              borderRadius: '50%',
              border: `${sw}px solid white`,
              background: 'rgba(255,255,255,0.18)',
              boxSizing: 'border-box',
            }}
          />
          {/* Magnifying glass handle */}
          <div
            style={{
              position: 'absolute',
              left: r(21 * u),
              top: r(21 * u),
              width: r(2 * u),
              height: r(5 * u),
              background: 'white',
              borderRadius: r(u),
              transform: 'rotate(45deg)',
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    ),
    { width: dim, height: dim },
  );
}

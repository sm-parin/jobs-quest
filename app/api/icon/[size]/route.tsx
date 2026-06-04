import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// Only serve the two sizes the manifest declares.
const ALLOWED = new Set(['192', '512']);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;

  if (!ALLOWED.has(size)) {
    return new Response('Not Found', { status: 404 });
  }

  const dim = parseInt(size, 10);
  const radius = Math.round(dim * 0.18);
  const fontSize = Math.round(dim * 0.32);

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
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          JQ
        </span>
      </div>
    ),
    { width: dim, height: dim },
  );
}

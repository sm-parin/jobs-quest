import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jobs Quest',
    short_name: 'Jobs Quest',
    description: 'Your personal job application tracker',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/icon',       // served by app/icon.tsx (favicon, 32x32)
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon', // served by app/apple-icon.tsx (180x180)
        sizes: '180x180',
        type: 'image/png',
      },
      // TODO Sprint 0 -> replace with real exported PNGs at these sizes:
      // { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      // { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

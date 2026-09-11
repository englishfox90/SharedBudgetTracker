import type { MetadataRoute } from 'next';

/** Web app manifest so the site can be installed to a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shared Balance Planner',
    short_name: 'Balance',
    description: 'Manage your shared checking account and forecast balances',
    start_url: '/?tab=forecast',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#1a1a1a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Badger Report PWA',
    short_name: 'BadgerReport',
    description: 'Roadside badger carcass reporting tool',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/badger-icon-new.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

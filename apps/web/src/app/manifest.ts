import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YKS 2026 Ölçme ve Değerlendirme',
    short_name: 'YKS 2026',
    description: 'AI Destekli Ölçme ve Değerlendirme Platformu',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

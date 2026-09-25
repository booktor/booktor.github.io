import type { NextConfig } from 'next'

const legacyRedirects: Record<string, string> = {
  '/inicio.html': '/',
  '/index.html': '/',
  '/catalogo.html': '/catalogo',
  '/nossabiblioteca.html': '/biblioteca',
  '/leitor.html': '/ler/bem-no-dia-que-meu-coracao-parou',
  '/leitor1.html': '/ler/onde-o-caos-nao-me-engoliu',
  '/leitor2.html': '/ler/bem-no-dia-que-meu-coracao-parou',
  '/teladelogin.html': '/login',
  '/teladelogin1.html': '/login',
  '/profile.html': '/perfil',
  '/comentarios.html': '/catalogo',
  '/chat.html': '/chat',
  '/chatprivado.html': '/chat',
}

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return Object.entries(legacyRedirects).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }))
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/books/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/covers/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

export default nextConfig

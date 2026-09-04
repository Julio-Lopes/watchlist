import type { NextConfig } from 'next';

/**
 * O browser enxerga tudo como primeira parte em *.vercel.app: o cookie de
 * sessao funciona sem atributo Domain e nao existe CORS. Trocar por dominio
 * proprio depois significa mudar este destino e o Domain do cookie na API.
*/
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:3333';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@watchlist/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  }
};

export default nextConfig;
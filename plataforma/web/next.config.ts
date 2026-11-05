import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Só estas imagens passam pelo otimizador: as capas iniciais (public/capas) e
  // as capas e fotos enviadas pelo painel (servidas pela API, nomes aleatórios).
  // As versões menores (640, 320 px...) em WebP/AVIF saem daqui, sob demanda.
  images: {
    localPatterns: [
      { pathname: "/capas/**", search: "" },
      { pathname: "/api/arquivos/publico/**", search: "" },
    ],
  },
  // O navegador fala só com o Next; /api/* segue para a API Spring.
  // Mesmo domínio: o cookie de sessão (httpOnly) e o XSRF-TOKEN funcionam sem CORS.
  async rewrites() {
    return [{ source: "/api/:caminho*", destination: `${API_URL}/api/:caminho*` }];
  },
  // As antigas "trilhas" viraram cursos.
  async redirects() {
    return [
      { source: "/trilhas/:slug", destination: "/cursos/:slug", permanent: true },
      { source: "/trilhas", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;

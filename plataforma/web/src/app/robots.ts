import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas pessoais e de conta não entram na busca.
      disallow: ["/admin", "/minha-conta", "/api/", "/boas-vindas", "/entrar", "/cadastro", "/redefinir-senha", "/verificar-email"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

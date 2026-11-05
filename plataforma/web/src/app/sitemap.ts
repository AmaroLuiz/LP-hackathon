import type { MetadataRoute } from "next";
import { listarCursos } from "@/lib/api";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cursos = await listarCursos();
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/cursos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/planos`, changeFrequency: "monthly", priority: 0.8 },
    ...cursos.map((c) => ({
      url: `${BASE}/cursos/${c.slug}`,
      lastModified: c.publicadoEm ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

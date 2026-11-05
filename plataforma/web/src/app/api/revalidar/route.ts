import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

// A API chama esta rota quando o catálogo muda no painel (curso publicado,
// editado, arquivado...). Rota do próprio Next: vem antes do rewrite /api/* → API.
// Só aceita quem tem o segredo compartilhado (REVALIDAR_SEGREDO).

const TAG = /^(catalogo|curso:[a-z0-9]+(-[a-z0-9]+)*)$/;

function segredoConfere(recebido: string | null): boolean {
  const esperado = process.env.REVALIDAR_SEGREDO;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!segredoConfere(request.headers.get("x-revalidar-segredo"))) {
    return Response.json({ revalidado: false }, { status: 401 });
  }
  const corpo = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(corpo?.tags) ? corpo.tags.filter((t): t is string => typeof t === "string" && TAG.test(t)) : [];
  if (tags.length === 0 || tags.length > 20) {
    return Response.json({ revalidado: false }, { status: 400 });
  }
  // Pedido de fora (a API): o conteúdo velho sai na hora, a próxima visita já busca o novo.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidado: true, tags });
}

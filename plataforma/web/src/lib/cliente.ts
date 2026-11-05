// Chamadas à API feitas no navegador (formulários). Passam pelo rewrite /api/*,
// no mesmo domínio, então o cookie de sessão vai sozinho. As mutações levam o
// token CSRF: o valor do cookie XSRF-TOKEN no cabeçalho X-XSRF-TOKEN.

export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; status: number; mensagem: string; campos: Record<string, string> };

function lerCookie(nome: string): string | null {
  const par = document.cookie.split("; ").find((c) => c.startsWith(`${nome}=`));
  return par ? decodeURIComponent(par.slice(nome.length + 1)) : null;
}

export async function tokenCsrf(renovar = false): Promise<string> {
  if (renovar || !lerCookie("XSRF-TOKEN")) {
    await fetch("/api/auth/csrf", { credentials: "same-origin" });
  }
  return lerCookie("XSRF-TOKEN") ?? "";
}

export async function enviar<T = null>(
  caminho: string,
  corpo: unknown,
  metodo: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  opcoes: { keepalive?: boolean } = {},
): Promise<Resultado<T>> {
  const tentar = async (renovar: boolean) =>
    fetch(caminho, {
      method: metodo,
      credentials: "same-origin",
      // keepalive: o pedido termina mesmo se a página fechar (salvar a posição do vídeo ao sair).
      keepalive: opcoes.keepalive,
      headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": await tokenCsrf(renovar) },
      body: JSON.stringify(corpo),
    });

  let resposta: Response;
  try {
    resposta = await tentar(false);
    // Token velho (sessão trocada): renova uma vez e tenta de novo.
    if (resposta.status === 403) resposta = await tentar(true);
  } catch {
    return { ok: false, status: 0, mensagem: "Sem conexão. Verifique a internet e tente de novo.", campos: {} };
  }

  if (resposta.ok) {
    const texto = await resposta.text();
    return { ok: true, dados: (texto ? JSON.parse(texto) : null) as T };
  }
  const problema = (await resposta.json().catch(() => null)) as {
    detail?: string;
    campos?: Record<string, string>;
  } | null;
  return {
    ok: false,
    status: resposta.status,
    mensagem:
      problema?.detail ??
      (resposta.status >= 500 ? "Não conseguimos falar com o servidor. Tente de novo em instantes." : "Algo deu errado. Tente de novo."),
    campos: problema?.campos ?? {},
  };
}

/** Só caminhos internos: evita redirecionar para outro site depois do login. */
export function destinoSeguro(voltar: string | null | undefined, padrao = "/"): string {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//") || voltar.startsWith("/\\")) return padrao;
  return voltar;
}

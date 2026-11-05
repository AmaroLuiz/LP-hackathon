import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIResponse, type Page } from "@playwright/test";

// Apoio dos testes de ponta a ponta. Senhas e e-mails são gerados na hora;
// a senha inicial do admin vem do mesmo lugar que a API usa (variável
// ADMIN_SENHA_INICIAL ou o valor de teste do application.properties).

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@potencia.local";

function senhaInicialDoAdmin(): string {
  if (process.env.ADMIN_SENHA_INICIAL) return process.env.ADMIN_SENHA_INICIAL;
  const props = readFileSync(resolve(process.cwd(), "../api/src/main/resources/application.properties"), "utf8");
  const m = props.match(/^potencia\.admin\.senha-inicial=\$\{ADMIN_SENHA_INICIAL:([^}]+)\}/m);
  if (!m) throw new Error("Não achei a senha inicial do admin no application.properties.");
  return m[1];
}

export function emailNovo(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemplo.com`;
}

export function senhaNova() {
  return `e2e-${crypto.randomUUID()}`;
}

/** Chamada à API pelo rewrite do site, com o cookie da página e o token CSRF. */
export async function api(page: Page, metodo: string, caminho: string, corpo?: unknown): Promise<APIResponse> {
  await page.request.get("/api/auth/csrf");
  const token = (await page.context().cookies()).find((c) => c.name === "XSRF-TOKEN")?.value ?? "";
  return page.request.fetch(caminho, {
    method: metodo,
    data: corpo,
    headers: { "X-XSRF-TOKEN": decodeURIComponent(token) },
  });
}

/** O link mais recente enviado para o e-mail (caixa de desenvolvimento da API). */
export async function linkDoEmail(page: Page, para: string, caminho: string): Promise<string> {
  let achado: string | undefined;
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/dev/emails?para=${encodeURIComponent(para)}`);
      const emails = (await r.json()) as { texto: string }[];
      const re = new RegExp(`${caminho.replace(/[?]/g, "\\?")}([A-Za-z0-9_-]+)`);
      achado = emails.map((e) => e.texto.match(re)?.[1]).find(Boolean);
      return achado;
    })
    .toBeTruthy();
  return `${caminho}${achado}`;
}

/** Aluno criado pela API, com e-mail confirmado, e logado na página. */
export async function alunoConfirmado(page: Page, nome: string, plano?: string) {
  const email = emailNovo("aluno");
  const senha = senhaNova();
  const r = await api(page, "POST", "/api/auth/cadastro", { nome, email, senha, aceitouTermos: true });
  expect(r.status()).toBe(201);
  const link = await linkDoEmail(page, email, "/verificar-email?token=");
  expect((await api(page, "POST", "/api/auth/verificar-email", { token: link.split("token=")[1] })).status()).toBe(204);
  if (plano) expect((await api(page, "POST", "/api/assinaturas", { planoId: plano })).status()).toBe(201);
  return { email, senha };
}

// Senha de teste criada pelos testes para o admin local; fica fora do git
// para a próxima execução reaproveitar (o banco local vive enquanto a API roda).
const ARQUIVO_SENHA_ADMIN = resolve(process.cwd(), "e2e/.senha-admin-local");

let senhaAdmin: string | undefined;

/**
 * Entra como admin pela tela de entrada. Tenta a senha guardada da execução
 * anterior; banco novo: usa a senha inicial e cria outra; senão, redefine pelo
 * link do e-mail (limite de 3 pedidos a cada 15 minutos).
 */
export async function entrarComoAdmin(page: Page) {
  if (!senhaAdmin) {
    const guardada = existsSync(ARQUIVO_SENHA_ADMIN) ? readFileSync(ARQUIVO_SENHA_ADMIN, "utf8").trim() : "";
    if (guardada && (await api(page, "POST", "/api/auth/entrar", { email: ADMIN_EMAIL, senha: guardada })).ok()) {
      senhaAdmin = guardada;
    } else {
      const inicial = senhaInicialDoAdmin();
      const nova = senhaNova();
      const primeira = await api(page, "POST", "/api/auth/entrar", { email: ADMIN_EMAIL, senha: inicial });
      if (primeira.ok()) {
        expect((await api(page, "POST", "/api/me/senha", { senhaAtual: inicial, novaSenha: nova })).status()).toBe(204);
      } else {
        expect((await api(page, "POST", "/api/auth/esqueci-senha", { email: ADMIN_EMAIL })).status()).toBe(202);
        const link = await linkDoEmail(page, ADMIN_EMAIL, "/redefinir-senha?token=");
        const r = await api(page, "POST", "/api/auth/redefinir-senha", { token: link.split("token=")[1], novaSenha: nova });
        expect(r.status(), "redefinir a senha do admin (limite de e-mails? espere 15 min ou reinicie a API)").toBe(204);
      }
      senhaAdmin = nova;
      writeFileSync(ARQUIVO_SENHA_ADMIN, nova);
    }
    await api(page, "POST", "/api/auth/sair");
  }
  await page.goto("/entrar?voltar=/admin");
  await page.getByRole("textbox", { name: /^E-mail/ }).fill(ADMIN_EMAIL);
  await page.getByLabel(/^Senha/).fill(senhaAdmin);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  // Exato: "/entrar?voltar=/admin" também termina em "/admin".
  await page.waitForURL((u) => u.pathname === "/admin");
}

import { expect, test, type Browser } from "@playwright/test";
import { alunoConfirmado, api, entrarComoAdmin } from "./apoio";

const CURSO = "primeiros-passos";

async function painelAdmin(browser: Browser) {
  const contexto = await browser.newContext({ baseURL: "http://localhost:3000", locale: "pt-BR" });
  const admin = await contexto.newPage();
  await entrarComoAdmin(admin);
  return { admin, fechar: () => contexto.close() };
}

test("pergunta no player, resposta da equipe pelo painel e avaliação moderada", async ({ page, browser }) => {
  await alunoConfirmado(page, "Paula Pergunta", "essencial");
  const titulo = `Como adapto para o cardápio? ${Date.now()}`;

  // Pergunta pela aba "Perguntas" da aula 2.
  await page.goto(`/aprender/${CURSO}/2`);
  await page.getByRole("tab", { name: "Perguntas" }).click();
  await page.getByLabel(/^Resumo da pergunta/).fill(titulo);
  await page.getByLabel(/^Detalhes/).fill("Queria usar o prompt da aula com os doces da semana.");
  await page.getByRole("button", { name: "Publicar pergunta" }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

  // A equipe responde pelo painel.
  const { admin, fechar } = await painelAdmin(browser);
  await admin.goto("/admin/perguntas");
  const cartao = admin.getByRole("article", { name: titulo });
  await cartao.getByLabel("Responder como Equipe PotencIA").fill("Troque a lista de produtos no fim do prompt.");
  await cartao.getByRole("button", { name: "Publicar resposta" }).click();
  await expect(admin.getByText("Resposta publicada. O aluno recebe um e-mail.")).toBeVisible();

  // O aluno vê a resposta destacada.
  await page.reload();
  await page.getByRole("tab", { name: "Perguntas" }).click();
  const pergunta = page.getByRole("article", { name: titulo });
  await expect(pergunta.getByText("Respondida pela equipe")).toBeVisible();
  await pergunta.getByRole("button", { name: /resposta/ }).click();
  await expect(pergunta.locator(".resposta--equipe")).toContainText("Troque a lista de produtos");

  // Avaliação: abre depois de 30% do curso (2 de 5 aulas).
  await page.getByRole("tab", { name: "Avaliações do curso" }).click();
  await expect(page.getByText("Avalie quando tiver avançado no curso")).toBeVisible();
  for (const aula of [1, 2]) await api(page, "PUT", `/api/aulas/${aula}/conclusao`, { concluida: true });
  await page.reload();
  await page.getByRole("tab", { name: "Avaliações do curso" }).click();
  // O rádio fica escondido (sr-only); quem usa mouse clica na estrela, que é o rótulo.
  await page.locator("label.entrada-nota__estrela", { has: page.locator('input[value="5"]') }).click();
  await expect(page.getByRole("radio", { name: /^5 estrelas/ })).toBeChecked();
  const comentario = `Montei o cardápio da semana em 10 minutos. ${Date.now()}`;
  await page.getByLabel(/^Comentário/).fill(comentario);
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(page.getByText("Obrigado! Sua avaliação já aparece na página do curso.")).toBeVisible();

  await page.goto(`/cursos/${CURSO}#avaliacoes`);
  await expect(page.getByText(comentario)).toBeVisible();
  await expect(page.getByText("Paula P.").first()).toBeVisible();

  // Moderação: escondida no painel, some da página do curso.
  await admin.goto("/admin/avaliacoes?nota=5");
  const avaliacao = admin.locator("article", { hasText: comentario });
  await avaliacao.getByRole("button", { name: "Esconder avaliação" }).click();
  await expect(admin.getByText(/Avaliação escondida/)).toBeVisible();
  // A API pede ao site para renovar o cache logo depois do commit: pode levar um instante.
  await expect(async () => {
    await page.reload();
    await expect(page.getByText(comentario)).toHaveCount(0, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await fechar();
});

test("cupom criado no painel dá desconto na assinatura", async ({ page, browser }) => {
  const codigo = `E2E${Date.now().toString(36).toUpperCase()}`;
  const { admin, fechar } = await painelAdmin(browser);
  await admin.goto("/admin/planos");
  await admin.getByLabel(/^Código/).fill(codigo);
  await admin.getByLabel(/^Desconto \(%\)/).last().fill("50");
  await admin.getByLabel(/^Cobranças com desconto/).last().fill("3");
  await admin.getByRole("button", { name: "Criar cupom" }).click();
  await expect(admin.getByText(`Cupom ${codigo} criado.`)).toBeVisible();
  await fechar();

  await alunoConfirmado(page, "Cida Cupom");
  await page.goto("/planos");
  await page.getByRole("button", { name: "Tem um cupom de desconto?" }).click();
  await page.getByLabel("Cupom de desconto").fill(codigo.toLowerCase());
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText(`${codigo}: 50% de desconto nas 3 primeiras mensalidades`)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`cupom=${codigo}`));
  await page.getByRole("button", { name: "Assinar o Completo" }).click();
  await expect(page).toHaveURL(/\/minha-conta\/assinatura/);
  await expect(page.getByText(`Cupom ${codigo}`)).toBeVisible();
  await expect(page.getByText("R$ 44,50").first()).toBeVisible();
});

test("perfil: salva dados, baixa os dados e exclui a conta", async ({ page }) => {
  const { email } = await alunoConfirmado(page, "Eli Exclusão", "essencial");
  await page.goto("/minha-conta/perfil");
  await page.getByRole("textbox", { name: "Cidade", exact: true }).fill("Olinda");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();
  await expect(page.getByText("Este aparelho")).toBeVisible();

  const dados = await page.request.get("/api/me/dados");
  expect(dados.headers()["content-disposition"]).toContain("attachment");
  expect((await dados.json()).conta.cidade).toBe("Olinda");

  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  const dialogo = page.getByRole("dialog", { name: "Excluir sua conta" });
  const confirmar = dialogo.getByRole("button", { name: "Excluir minha conta" });
  await expect(confirmar).toBeDisabled();
  await dialogo.getByLabel(/Para confirmar, digite/).fill(email);
  await confirmar.click();
  await page.waitForURL((u) => u.pathname === "/");
  expect((await page.request.get("/api/me")).status()).toBe(401);
});

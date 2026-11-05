import { expect, test } from "@playwright/test";
import { api, entrarComoAdmin } from "./apoio";

test("admin cria um curso, monta o currículo, publica e o curso aparece no catálogo", async ({ page }) => {
  await entrarComoAdmin(page);
  const titulo = `Curso de ponta a ponta ${Date.now()}`;

  // Rascunho pela tela.
  await page.goto("/admin/cursos");
  await page.getByRole("button", { name: "Novo curso" }).click();
  const novo = page.getByRole("dialog", { name: "Novo curso" });
  await novo.getByLabel(/^Título/).fill(titulo);
  await novo.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page).toHaveURL(/\/admin\/cursos\/\d+$/);
  const id = page.url().match(/(\d+)$/)![1];

  // Currículo pela tela: um módulo e uma aula de texto, publicada e de prévia.
  await page.getByRole("tab", { name: "Currículo" }).click();
  await page.getByRole("button", { name: "Criar o primeiro módulo" }).click();
  await page.getByLabel(/^Título do módulo/).fill("Começando");
  await page.getByRole("button", { name: "Criar módulo" }).click();
  await page.getByRole("button", { name: /Nova aula em "Começando"/ }).click();
  const gaveta = page.getByRole("dialog", { name: /Nova aula/ });
  await gaveta.getByLabel(/^Título/).fill("Primeira aula");
  await gaveta.getByLabel("Tipo").selectOption("TEXTO");
  await gaveta.getByLabel(/^Conteúdo da aula/).fill("Abra o Claude e peça três ideias de post para o seu negócio.");
  await gaveta.getByLabel(/^Duração/).fill("5:00");
  const previa = gaveta.getByRole("switch", { name: "Prévia grátis" });
  if ((await previa.getAttribute("aria-checked")) !== "true") await previa.click();
  const publicada = gaveta.getByRole("switch", { name: "Publicada" });
  if ((await publicada.getAttribute("aria-checked")) !== "true") await publicada.click();
  await gaveta.getByRole("button", { name: "Criar aula" }).click();
  await expect(page.getByRole("button", { name: "Primeira aula", exact: true })).toBeVisible();

  // O resto da página do curso (textos, capa, instrutor, plano) pela API do
  // painel: o formulário longo já é coberto pelos testes da API.
  const curso = await (await api(page, "GET", `/api/admin/cursos/${id}`)).json();
  const instrutores = (await (await api(page, "GET", "/api/admin/instrutores")).json()) as { id: number }[];
  const editado = await api(page, "PUT", `/api/admin/cursos/${id}`, {
    ...curso,
    subtitulo: "Do zero ao primeiro post com IA",
    descricao: "Um curso curto para testar a publicação de ponta a ponta.",
    capaUrl: "/capas/artes-e-carrosseis.webp",
    capaAlt: "Mesa com celular mostrando um carrossel",
    oQueAprende: ["Pedir ideias de post", "Revisar o texto", "Ajustar o tom da marca", "Publicar"],
    resultadoFinal: "Um post pronto para publicar",
    instrutores: [instrutores[0].id],
  });
  expect(editado.status()).toBe(200);
  expect((await api(page, "PUT", `/api/admin/cursos/${id}/planos`, { planos: ["completo"] })).status()).toBe(200);

  // Publica pela tela.
  await page.reload();
  await page.getByRole("tab", { name: /Publicar/ }).click();
  await page.getByRole("button", { name: "Publicar curso" }).click();
  await expect(page.getByText("Curso publicado. Já aparece no catálogo.")).toBeVisible();

  // Catálogo público (revalidado pela API ao publicar).
  await page.goto(`/cursos/${curso.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  await page.goto("/cursos");
  await expect(page.getByRole("link", { name: new RegExp(titulo) }).first()).toBeVisible();
});

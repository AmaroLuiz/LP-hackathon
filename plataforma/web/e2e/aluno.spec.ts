import { expect, test, type Page } from "@playwright/test";
import { alunoConfirmado, api, emailNovo, linkDoEmail, senhaNova } from "./apoio";

const CURSO = "primeiros-passos";

/**
 * Marca a aula atual. No modo dev a primeira visita compila o player: um clique
 * antes de a página hidratar é desfeito pelo React, então tenta de novo.
 */
async function concluirAula(page: Page, feitas: number) {
  await expect(async () => {
    await page.getByLabel("Marcar como concluída").check({ timeout: 2_000 });
    await expect(page.getByText(`${feitas} de 5 aulas`)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

test("visitante vê o catálogo e a prévia, assina, estuda, conclui e valida o certificado", async ({ page, browser }) => {
  // Catálogo e página do curso, sem login.
  await page.goto("/cursos");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto(`/cursos/${CURSO}`);
  await expect(page.getByRole("heading", { level: 1, name: /Primeiros passos/ })).toBeVisible();

  // Prévia grátis abre num modal com o vídeo.
  await page.getByRole("button", { name: "Assistir prévia grátis", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  // Cadastro pela tela.
  const email = emailNovo("visitante");
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Vera Visitante");
  await page.getByRole("textbox", { name: /^E-mail/ }).fill(email);
  await page.getByLabel("Crie uma senha").fill(senhaNova());
  await page.getByLabel(/Li e aceito os/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).not.toHaveURL(/\/cadastro/);

  // Confirma o e-mail pelo link (caixa de desenvolvimento).
  await page.goto(await linkDoEmail(page, email, "/verificar-email?token="));
  await expect(page.getByText("E-mail confirmado.")).toBeVisible();

  // Assina o Essencial com o gateway falso (aprova na hora).
  await page.goto("/planos");
  await page.getByRole("button", { name: "Assinar o Essencial" }).click();
  await expect(page).toHaveURL(/\/minha-conta\/assinatura/);
  await expect(page.getByText("Ativa", { exact: true }).first()).toBeVisible();

  // Abre o curso: cai na primeira aula; conclui e o progresso fica depois de recarregar.
  await page.goto(`/aprender/${CURSO}`);
  await expect(page).toHaveURL(new RegExp(`/aprender/${CURSO}/\\d+$`));
  await concluirAula(page, 1);
  await page.reload();
  await expect(page.getByText("1 de 5 aulas")).toBeVisible();
  await expect(page.getByLabel("Aula concluída")).toBeChecked();

  // Conclui as outras aulas indo de "Próxima aula" em "Próxima aula".
  for (let i = 2; i <= 5; i++) {
    await page.getByRole("link", { name: /Próxima aula/ }).click();
    await expect(page.getByText(`Aula ${i} de 5`)).toBeVisible();
    await concluirAula(page, i);
  }

  // Parabéns com o certificado.
  const parabens = page.getByRole("dialog", { name: "Curso concluído!" });
  await expect(parabens).toBeVisible();
  await parabens.getByRole("link", { name: "Ver meu certificado" }).click();
  await expect(page).toHaveURL(/\/certificados\/PTC-/);
  await expect(page.getByText("Vera Visitante").first()).toBeVisible();
  const endereco = page.url();

  // Validação pública: outra pessoa, sem login, abre o mesmo endereço.
  const visitante = await browser.newContext({ baseURL: "http://localhost:3000" });
  const outra = await visitante.newPage();
  await outra.goto(endereco);
  await expect(outra.getByText("Certificado válido, emitido pela PotencIA.")).toBeVisible();
  await visitante.close();
});

test("aluno sem plano recebe 403 na aula e vê o convite para assinar", async ({ page }) => {
  await alunoConfirmado(page, "Sílvio Sem Plano");
  const curso = await (await page.request.get(`/api/cursos/${CURSO}`)).json();
  const aulas = (curso.modulos as { aulas: { id: number; previa: boolean }[] }[]).flatMap((m) => m.aulas);
  const fechada = aulas.find((a) => !a.previa)!;

  expect((await api(page, "GET", `/api/aulas/${fechada.id}`)).status()).toBe(403);

  await page.goto(`/aprender/${CURSO}/${fechada.id}`);
  await expect(page.getByText("Este curso faz parte de um plano.")).toBeVisible();
  await page.getByRole("link", { name: "Ver os planos" }).click();
  await expect(page).toHaveURL(new RegExp(`/planos\\?curso=${CURSO}`));
  await expect(page.getByRole("button", { name: "Assinar o Essencial" })).toBeVisible();
});

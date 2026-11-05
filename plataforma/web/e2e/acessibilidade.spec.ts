import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { alunoConfirmado, entrarComoAdmin } from "./apoio";

// Auditoria automática (axe, WCAG 2.1 A/AA) nas telas principais. Falha em
// violação séria ou crítica; as moderadas aparecem no relatório como anotação.

async function auditar(page: Page, caminho: string) {
  await page.goto(caminho);
  // "networkidle" nunca chega no modo dev (conexão aberta do recarregamento automático).
  await page.waitForLoadState("load");
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(1500);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const leves = r.violations.filter((v) => !graves.includes(v));
  if (leves.length) {
    test.info().annotations.push({ type: "axe (moderado)", description: `${caminho}: ${leves.map((v) => v.id).join(", ")}` });
  }
  expect(
    graves.map((v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
    `violações graves em ${caminho}`,
  ).toEqual([]);
}

test.describe("visitante", () => {
  for (const caminho of ["/", "/cursos", "/cursos/primeiros-passos", "/planos", "/entrar", "/cadastro", "/privacidade"]) {
    test(`sem violações graves em ${caminho}`, async ({ page }) => {
      await auditar(page, caminho);
    });
  }
});

test("aluno: player, perfil e minha assinatura", async ({ page }) => {
  await alunoConfirmado(page, "Ana Acessível", "essencial");
  for (const caminho of ["/aprender/primeiros-passos/2", "/minha-conta/perfil", "/minha-conta/assinatura", "/minha-conta/cursos"]) {
    await auditar(page, caminho);
  }
});

test("admin: visão geral, moderação e planos", async ({ page }) => {
  await entrarComoAdmin(page);
  for (const caminho of ["/admin", "/admin/avaliacoes", "/admin/perguntas", "/admin/planos"]) {
    await auditar(page, caminho);
  }
});

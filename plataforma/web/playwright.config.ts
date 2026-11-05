import { defineConfig } from "@playwright/test";

// Testes de ponta a ponta: API Spring (jar) + site Next em modo dev, no Chrome
// instalado na máquina (sem baixar navegador). Se os dois já estiverem rodando
// (npm run dev e o jar), são reaproveitados.
//
//   cd api && ./mvnw -o package -DskipTests   (gera o jar uma vez)
//   cd web && npm run e2e

const API = "http://localhost:8080";
const SITE = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Um por vez: o banco local é um só (em memória) e o limitador de tentativas também.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/relatorio" }]],
  outputDir: "e2e/resultados",
  use: {
    baseURL: SITE,
    channel: "chrome",
    headless: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "java -Dpotencia.armazenamento.pasta=../api/dados/arquivos -jar ../api/target/api-0.0.1-SNAPSHOT.jar",
      url: `${API}/api/planos`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev",
      url: `${SITE}/entrar`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});

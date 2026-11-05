// Mede as páginas públicas no build de produção, com a mesma limitação do
// Lighthouse mobile (CPU 4× mais lenta, 4G lento: 150 ms e 1,6 Mbps).
//
//   npm run build && npm run start -- -p 3100     (com a API no ar)
//   node scripts/medir-desempenho.mjs http://localhost:3100
//
// Mostra FCP, LCP, CLS, TBT (soma do que passa de 50 ms nas tarefas longas)
// e quanto foi baixado (JS e total). Cada página roda uma vez para aquecer o
// cache do servidor e a medida é a segunda visita, com o navegador zerado.

import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const paginas = ["/", "/cursos", "/cursos/primeiros-passos", "/planos", "/entrar"];

const navegador = await chromium.launch({ channel: "chrome", headless: true });

async function medir(caminho) {
  const contexto = await navegador.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, locale: "pt-BR" });
  const pagina = await contexto.newPage();
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  let js = 0;
  let total = 0;
  cdp.on("Network.loadingFinished", (e) => (total += e.encodedDataLength));
  const tipos = new Map();
  cdp.on("Network.responseReceived", (e) => tipos.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => {
    if (tipos.get(e.requestId) === "Script") js += e.encodedDataLength;
  });

  await pagina.addInitScript(() => {
    window.__medidas = { lcp: 0, cls: 0, tbt: 0, fcp: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__medidas.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__medidas.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__medidas.tbt += Math.max(0, e.duration - 50)))).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === "first-contentful-paint") window.__medidas.fcp = e.startTime; })).observe({ type: "paint", buffered: true });
  });

  await pagina.goto(base + caminho, { waitUntil: "load", timeout: 120_000 });
  await pagina.waitForTimeout(3000);
  const m = await pagina.evaluate(() => window.__medidas);
  await contexto.close();
  return { caminho, fcp: Math.round(m.fcp), lcp: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)), tbt: Math.round(m.tbt), jsKB: Math.round(js / 1024), totalKB: Math.round(total / 1024) };
}

const linhas = [];
for (const caminho of paginas) {
  await medir(caminho); // aquece o cache do servidor
  linhas.push(await medir(caminho));
}
await navegador.close();
console.table(linhas);

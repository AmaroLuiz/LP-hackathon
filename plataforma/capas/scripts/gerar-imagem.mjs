// Gera a imagem crua (sem texto) de uma trilha a partir do prompt e das referências de estilo.
//
//   node scripts/gerar-imagem.mjs <slug> [quantidade]
//
// A chave vem de plataforma/capas/.env (fora do git): OPENAI_API_KEY ou GEMINI_API_KEY.
// IMAGEM_MODELO troca o modelo sem mexer no código.
// Saída: plataforma/capas-fonte/<slug>-<n>.png. A escolhida é copiada para <slug>.png.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { montarPrompt } from "./prompts.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const plataforma = join(raiz, "..");
if (existsSync(join(raiz, ".env"))) process.loadEnvFile(join(raiz, ".env"));

// Só ref-1, ref-2 e ref-3 vão para o gerador; ref-4 e ref-5 puxam rosto, dólar e vermelho.
const REFERENCIAS = ["ref-1-rei-caindo-pb.webp", "ref-2-impacto-estilhaco.webp", "ref-3-chess-escuro.png"].map(
  (f) => join(plataforma, "capas-referencias", f),
);
const mime = (f) => (f.endsWith(".png") ? "image/png" : "image/webp");

const [slug, qtdArg] = process.argv.slice(2);
if (!slug) {
  console.error("uso: node scripts/gerar-imagem.mjs <slug> [quantidade]");
  process.exit(1);
}
const quantidade = Number(qtdArg ?? 2);
const prompt = montarPrompt(slug, true);
const destino = join(plataforma, "capas-fonte");
mkdirSync(destino, { recursive: true });

const viaOpenAI = async () => {
  const form = new FormData();
  form.append("model", process.env.IMAGEM_MODELO ?? "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1536x1024");
  form.append("quality", "high");
  form.append("n", String(quantidade));
  for (const f of REFERENCIAS) {
    form.append("image[]", new Blob([readFileSync(f)], { type: mime(f) }), f.split(/[\\/]/).pop());
  }
  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(json.error ?? json));
  return json.data.map((d) => Buffer.from(d.b64_json, "base64"));
};

const viaGemini = async () => {
  const modelo = process.env.IMAGEM_MODELO ?? "gemini-2.5-flash-image";
  const parts = [
    ...REFERENCIAS.map((f) => ({ inlineData: { mimeType: mime(f), data: readFileSync(f).toString("base64") } })),
    { text: prompt },
  ];
  const saidas = [];
  for (let i = 0; i < quantidade; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
      }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(json.error ?? json));
    const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!img) throw new Error(`Sem imagem na resposta: ${JSON.stringify(json).slice(0, 400)}`);
    saidas.push(Buffer.from(img.data, "base64"));
  }
  return saidas;
};

const gerar = process.env.OPENAI_API_KEY ? viaOpenAI : process.env.GEMINI_API_KEY ? viaGemini : null;
if (!gerar) {
  console.error("Defina OPENAI_API_KEY ou GEMINI_API_KEY em plataforma/capas/.env");
  process.exit(1);
}

const imagens = await gerar();
let n = 1;
for (const img of imagens) {
  while (existsSync(join(destino, `${slug}-${n}.png`))) n++;
  const arq = join(destino, `${slug}-${n}.png`);
  writeFileSync(arq, img);
  console.log(arq);
}

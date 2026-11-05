import { enviar, tokenCsrf, type Resultado } from "./cliente";

// Envio de arquivos pelo painel, em dois passos (como num provedor de nuvem):
// 1) pede à API uma URL de envio assinada; 2) manda o arquivo puro para ela,
// com barra de progresso. A API confere o tipo real, o tamanho e a proporção.

export type TipoEnvio = "CAPA" | "FOTO" | "LEGENDA" | "MATERIAL" | "VIDEO";

export type ArquivoEnviado = {
  chave: string;
  url: string | null;
  referencia: string;
  nome: string;
  tamanhoBytes: number;
  tipoMime: string;
  largura: number | null;
  altura: number | null;
};

type Preparo = { url: string; metodo: "PUT"; expiraEm: string; tamanhoMaximo: number };

export async function enviarArquivo(
  tipo: TipoEnvio,
  arquivo: Blob,
  nome: string,
  aoProgredir?: (fracao: number) => void,
): Promise<Resultado<ArquivoEnviado>> {
  const preparo = await enviar<Preparo>("/api/admin/uploads", { tipo, nome, tamanho: arquivo.size });
  if (!preparo.ok) return preparo;
  const token = await tokenCsrf();

  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open(preparo.dados.metodo, preparo.dados.url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-XSRF-TOKEN", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let corpo: { detail?: string; campos?: Record<string, string> } | ArquivoEnviado | null = null;
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {
        corpo = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && corpo) {
        resolver({ ok: true, dados: corpo as ArquivoEnviado });
        return;
      }
      const problema = corpo as { detail?: string } | null;
      resolver({
        ok: false,
        status: xhr.status,
        mensagem: problema?.detail ?? "Não foi possível enviar o arquivo. Tente de novo.",
        campos: {},
      });
    };
    xhr.onerror = () =>
      resolver({ ok: false, status: 0, mensagem: "O envio caiu. Verifique a internet e tente de novo.", campos: {} });
    xhr.send(arquivo);
  });
}

/** Área da imagem original (em pixels) que vai para o recorte. */
export type Recorte = { x: number; y: number; largura: number; altura: number };

/**
 * Recorta e reduz no navegador, gerando WebP (ou JPEG, onde o navegador não
 * gera WebP). Assim a capa já chega no tamanho final e sem metadados da câmera.
 */
export async function recortar(imagem: HTMLImageElement, recorte: Recorte, largura: number, altura: number): Promise<File> {
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d");
  if (!contexto) throw new Error("Sem suporte a desenho de imagens neste navegador.");
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(imagem, recorte.x, recorte.y, recorte.largura, recorte.altura, 0, 0, largura, altura);
  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/webp", 0.86));
  const final = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/jpeg", 0.88));
  if (!final) throw new Error("Não foi possível preparar a imagem.");
  const extensao = final.type === "image/webp" ? "webp" : "jpg";
  return new File([final], `recorte.${extensao}`, { type: final.type });
}

/** Lê a duração de um vídeo escolhido, antes de enviar (em segundos, arredondada). */
export function duracaoDoVideo(arquivo: File): Promise<number | null> {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(arquivo);
    const video = document.createElement("video");
    video.preload = "metadata";
    const fim = (valor: number | null) => {
      URL.revokeObjectURL(url);
      resolver(valor);
    };
    video.onloadedmetadata = () => fim(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    video.onerror = () => fim(null);
    video.src = url;
  });
}

"use client";

import { useId, useState } from "react";
import { Aviso, BarraProgresso } from "@/components/ui/Exibicao";
import { enviarArquivo, type ArquivoEnviado, type TipoEnvio } from "@/lib/envio";

/** Escolher um arquivo e enviar na hora, com barra de progresso (vídeo, legenda, material). */
export function EnvioArquivo({
  tipo,
  accept,
  rotulo,
  ajuda,
  aoEnviar,
  aoEscolher,
}: {
  tipo: TipoEnvio;
  accept: string;
  rotulo: string;
  ajuda?: string;
  aoEnviar: (arquivo: ArquivoEnviado, original: File) => void | Promise<void>;
  /** Antes do envio (ex.: ler a duração do vídeo). */
  aoEscolher?: (arquivo: File) => void;
}) {
  const id = useId();
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    aoEscolher?.(arquivo);
    setProgresso(0);
    const r = await enviarArquivo(tipo, arquivo, arquivo.name, setProgresso);
    setProgresso(null);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    await aoEnviar(r.dados, arquivo);
  }

  return (
    <div className="envio-arquivo">
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only envio-entrada"
        disabled={progresso !== null}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        onChange={(e) => {
          void escolher(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <label className={`botao botao--secundario botao--pequeno${progresso !== null ? " is-desligado" : ""}`} htmlFor={id}>
        {progresso !== null ? "Enviando…" : rotulo}
      </label>
      {ajuda && (
        <p className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </p>
      )}
      {progresso !== null && <BarraProgresso valor={progresso * 100} rotulo={`Envio: ${rotulo.toLowerCase()}`} />}
      {erro && <Aviso tipo="erro" titulo={erro} />}
    </div>
  );
}

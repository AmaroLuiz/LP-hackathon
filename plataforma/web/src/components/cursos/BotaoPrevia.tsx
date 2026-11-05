"use client";

import { useState } from "react";
import { Aviso } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { Modal } from "@/components/ui/Modal";
import type { Previa } from "@/lib/aprender";

/** Abre a aula de prévia num modal, sem precisar de conta. */
export function BotaoPrevia({ aulaId, titulo, rotulo, className }: { aulaId: number; titulo: string; rotulo?: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState(false);

  async function abrir() {
    setAberto(true);
    if (previa) return;
    try {
      const r = await fetch(`/api/aulas/${aulaId}/previa`);
      if (!r.ok) throw new Error();
      setPrevia((await r.json()) as Previa);
    } catch {
      setErro(true);
    }
  }

  return (
    <>
      <button type="button" className={className ?? "previa-botao"} onClick={abrir}>
        <Icone nome="play" tamanho={14} />
        {rotulo ?? titulo}
        {!rotulo && <span className="sr-only"> (assistir prévia grátis)</span>}
      </button>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={`Prévia: ${titulo}`} largo>
        {erro ? (
          <Aviso tipo="erro" titulo="Não conseguimos abrir a prévia agora. Tente de novo em instantes." />
        ) : !previa ? (
          <p className="modal__carregando">Carregando a prévia…</p>
        ) : previa.video ? (
          <video
            className="modal__video"
            src={previa.video.url}
            poster={previa.video.poster ?? undefined}
            controls
            autoPlay
            playsInline
            aria-label={`Prévia: ${previa.titulo}`}
          />
        ) : (
          <Aviso tipo="info" titulo="O vídeo desta prévia ainda não está disponível." />
        )}
      </Modal>
    </>
  );
}

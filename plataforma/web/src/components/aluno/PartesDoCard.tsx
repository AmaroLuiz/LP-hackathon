"use client";

import { BarraProgresso } from "@/components/ui/Exibicao";
import { useAluno } from "./ProvedorAluno";

/** Coração da lista de desejos, sobre a capa do card. */
export function BotaoDesejo({ cursoId, slug, titulo }: { cursoId: number; slug: string; titulo: string }) {
  const { desejos, alternarDesejo } = useAluno();
  const ativo = desejos.has(cursoId);
  return (
    <button
      type="button"
      className={`desejo${ativo ? " is-ativo" : ""}`}
      aria-pressed={ativo}
      onClick={() => alternarDesejo(cursoId, slug)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          fill={ativo ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="sr-only">{ativo ? `Tirar ${titulo} da lista de desejos` : `Guardar ${titulo} na lista de desejos`}</span>
    </button>
  );
}

/** Barra de progresso no card, só quando o aluno já começou o curso. */
export function ProgressoDoCard({ cursoId }: { cursoId: number }) {
  const { progresso } = useAluno();
  const valor = progresso[cursoId];
  if (valor === undefined) return null;
  return (
    <div className="card-curso__progresso">
      <BarraProgresso valor={valor} rotulo="Seu progresso no curso" />
    </div>
  );
}

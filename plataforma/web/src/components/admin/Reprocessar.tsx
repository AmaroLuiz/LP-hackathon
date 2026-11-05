"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import type { EventoGateway } from "@/lib/assinatura";
import { enviar } from "@/lib/cliente";

/** Processa de novo um evento do gateway que falhou (ex.: chegou antes do checkout pago). */
export function Reprocessar({ id }: { id: string }) {
  const [enviando, setEnviando] = useState(false);
  const { avisar } = useAvisos();
  const router = useRouter();
  return (
    <Botao
      pequeno
      variante="secundario"
      carregando={enviando}
      textoCarregando="Processando…"
      onClick={async () => {
        setEnviando(true);
        const r = await enviar<EventoGateway>(`/api/admin/eventos-gateway/${encodeURIComponent(id)}/reprocessar`, {});
        setEnviando(false);
        if (!r.ok) return avisar(r.mensagem, "erro");
        avisar(r.dados.processadoEm ? "Evento processado." : `Falhou de novo: ${r.dados.erro ?? "sem detalhe"}`, r.dados.processadoEm ? "sucesso" : "erro");
        router.refresh();
      }}
    >
      Reprocessar<span className="sr-only"> o evento {id}</span>
    </Botao>
  );
}

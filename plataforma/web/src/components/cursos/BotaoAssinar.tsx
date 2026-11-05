"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAluno } from "@/components/aluno/ProvedorAluno";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { enviar } from "@/lib/cliente";

type Iniciada = { id: string; status: string; urlPagamento: string | null };

/**
 * Assinar um plano. Visitante vai para o cadastro. Logado vai para a página de
 * pagamento do gateway (o cartão é digitado lá, nunca aqui) ou, no ambiente
 * local, o gateway falso aprova na hora.
 */
export function BotaoAssinar({ planoId, nome, destaque }: { planoId: string; nome: string; destaque?: boolean }) {
  const { logado } = useAluno();
  const router = useRouter();
  const parametros = useSearchParams();
  const curso = parametros.get("curso");
  const cupom = parametros.get("cupom");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  if (logado === false) {
    return (
      <BotaoLink href={`/cadastro?voltar=${encodeURIComponent(`/planos?${new URLSearchParams({ ...(curso ? { curso } : {}), ...(cupom ? { cupom } : {}) })}`)}`} variante={destaque ? "principal" : "secundario"} largo>
        Começar com o {nome}
      </BotaoLink>
    );
  }

  async function assinar() {
    setEnviando(true);
    setMensagem(null);
    const r = await enviar<Iniciada>("/api/assinaturas", { planoId, cupom });
    if (r.ok && r.dados.urlPagamento) {
      // Página de pagamento do gateway; na volta, "Minha assinatura" mostra o resultado.
      window.location.assign(r.dados.urlPagamento);
      return;
    }
    setEnviando(false);
    if (r.ok) {
      router.push(curso ? `/cursos/${encodeURIComponent(curso)}` : "/minha-conta/assinatura?checkout=ok");
      router.refresh();
    } else if (r.status === 401) {
      router.push(`/entrar?voltar=${encodeURIComponent("/planos")}`);
    } else if (r.status === 409) {
      setMensagem("Você já tem uma assinatura ativa. Para mudar de plano, use Minha assinatura.");
    } else {
      setMensagem(r.campos.cupom ?? r.campos.planoId ?? r.mensagem);
    }
  }

  return (
    <div className="assinar">
      <Botao variante={destaque ? "principal" : "secundario"} largo onClick={assinar} carregando={enviando} textoCarregando="Abrindo o pagamento…" disabled={logado === null}>
        Assinar o {nome}
      </Botao>
      {mensagem && (
        <p className="assinar__mensagem" role="alert">
          {mensagem}{" "}
          {mensagem.includes("Minha assinatura") && (
            <a href="/minha-conta/assinatura" className="link link--sublinhado">
              Abrir
            </a>
          )}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Exibicao";
import { enviar } from "@/lib/cliente";

type Estado = { tipo: "confirmando" } | { tipo: "ok" } | { tipo: "erro"; mensagem: string };

/** Link da troca de e-mail: confirma o endereço novo e pede para entrar de novo com ele. */
export function ConfirmarEmailNovo() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(
    token ? { tipo: "confirmando" } : { tipo: "erro", mensagem: "Este link está incompleto." },
  );
  // Link de uso único: uma chamada só, mesmo com o efeito rodando duas vezes em desenvolvimento.
  const enviado = useRef(false);

  useEffect(() => {
    if (!token || enviado.current) return;
    enviado.current = true;
    enviar("/api/auth/confirmar-email", { token }).then((r) => {
      setEstado(r.ok ? { tipo: "ok" } : { tipo: "erro", mensagem: r.mensagem });
      if (r.ok) router.refresh();
    });
  }, [token, router]);

  if (estado.tipo === "confirmando") return <Aviso tipo="info" titulo="Confirmando o novo e-mail…" />;
  if (estado.tipo === "ok") {
    return (
      <div className="formulario">
        <Aviso tipo="sucesso" titulo="E-mail trocado.">
          Por segurança, saímos da sua conta em todos os aparelhos. Entre de novo com o e-mail novo.
        </Aviso>
        <BotaoLink href="/entrar?voltar=/minha-conta/perfil" largo>
          Entrar
        </BotaoLink>
      </div>
    );
  }
  return (
    <div className="formulario">
      <Aviso tipo="erro" titulo={estado.mensagem}>
        Peça a troca de novo no seu perfil.
      </Aviso>
      <BotaoLink href="/minha-conta/perfil" largo>
        Ir para o perfil
      </BotaoLink>
    </div>
  );
}

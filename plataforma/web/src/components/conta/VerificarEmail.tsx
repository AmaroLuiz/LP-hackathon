"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Exibicao";
import { enviar } from "@/lib/cliente";

type Estado = { tipo: "verificando" } | { tipo: "ok" } | { tipo: "erro"; mensagem: string };

export function VerificarEmail() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(
    token ? { tipo: "verificando" } : { tipo: "erro", mensagem: "Este link está incompleto." },
  );
  // O link é de uso único: garante uma chamada só, mesmo com o efeito rodando duas vezes em desenvolvimento.
  const enviado = useRef(false);

  useEffect(() => {
    if (!token || enviado.current) return;
    enviado.current = true;
    enviar("/api/auth/verificar-email", { token }).then((r) => {
      setEstado(r.ok ? { tipo: "ok" } : { tipo: "erro", mensagem: r.mensagem });
      if (r.ok) router.refresh();
    });
  }, [token, router]);

  if (estado.tipo === "verificando") {
    return <Aviso tipo="info" titulo="Confirmando seu e-mail…" />;
  }
  if (estado.tipo === "ok") {
    return (
      <div className="formulario">
        <Aviso tipo="sucesso" titulo="E-mail confirmado. Tudo certo com a sua conta." />
        <BotaoLink href="/" largo>
          Ver os cursos
        </BotaoLink>
      </div>
    );
  }
  return (
    <div className="formulario">
      <Aviso tipo="erro" titulo={estado.mensagem}>
        Entre na sua conta e use “Reenviar link”, no aviso do topo da página.
      </Aviso>
      <BotaoLink href="/entrar" largo>
        Entrar
      </BotaoLink>
    </div>
  );
}

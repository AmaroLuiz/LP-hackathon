"use client";

import Link from "next/link";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Exibicao";
import { useFormulario } from "./useFormulario";

export function FormEsqueciSenha() {
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter("/api/auth/esqueci-senha", { email });
    if (r.ok) setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="formulario">
        <Aviso tipo="sucesso" titulo="Confira seu e-mail">
          Se existir uma conta com <strong>{email}</strong>, você vai receber um link para criar uma senha nova. Ele vale por
          1 hora. Não chegou? Olhe a caixa de spam.
        </Aviso>
        <p className="formulario__rodape">
          <Link href="/entrar" className="link link--sublinhado">
            Voltar para entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={aoEnviar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <Campo
        id="email"
        rotulo="E-mail da sua conta"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          limparErro("email");
        }}
        erro={erros.email}
      />
      <Botao type="submit" largo carregando={enviando} textoCarregando="Enviando…">
        Enviar link
      </Botao>
      <p className="formulario__rodape">
        Lembrou?{" "}
        <Link href="/entrar" className="link link--sublinhado">
          Entrar
        </Link>
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BotaoLink, Botao } from "@/components/ui/Botao";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { Aviso } from "@/components/ui/Exibicao";
import { useFormulario } from "./useFormulario";

export function FormRedefinirSenha() {
  const token = useSearchParams().get("token");
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erroConfirmacao, setErroConfirmacao] = useState<string>();
  const [pronto, setPronto] = useState(false);

  if (!token) {
    return (
      <div className="formulario">
        <Aviso tipo="erro" titulo="Este link está incompleto.">
          Abra o link direto do e-mail ou peça um novo.
        </Aviso>
        <BotaoLink href="/esqueci-senha" largo>
          Pedir um link novo
        </BotaoLink>
      </div>
    );
  }

  if (pronto) {
    return (
      <div className="formulario">
        <Aviso tipo="sucesso" titulo="Senha alterada.">
          Por segurança, encerramos as sessões abertas em outros aparelhos. Entre com a senha nova.
        </Aviso>
        <BotaoLink href="/entrar" largo>
          Entrar
        </BotaoLink>
      </div>
    );
  }

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmacao) {
      setErroConfirmacao("As duas senhas não são iguais.");
      return;
    }
    setErroConfirmacao(undefined);
    const r = await submeter("/api/auth/redefinir-senha", { token, novaSenha });
    if (r.ok) setPronto(true);
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={aoEnviar} noValidate>
      {mensagem && (
        <Aviso tipo="erro" titulo={mensagem}>
          <Link href="/esqueci-senha" className="link link--sublinhado">
            Pedir um link novo
          </Link>
        </Aviso>
      )}
      <CampoSenha
        id="nova-senha"
        rotulo="Senha nova"
        autoComplete="new-password"
        required
        medidor
        value={novaSenha}
        onChange={(e) => {
          setNovaSenha(e.target.value);
          limparErro("novaSenha");
        }}
        erro={erros.novaSenha}
        ajuda="No mínimo 10 caracteres."
      />
      <CampoSenha
        id="confirmacao"
        rotulo="Repita a senha nova"
        autoComplete="new-password"
        required
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        erro={erroConfirmacao}
      />
      <Botao type="submit" largo carregando={enviando} textoCarregando="Salvando…">
        Salvar senha nova
      </Botao>
    </form>
  );
}

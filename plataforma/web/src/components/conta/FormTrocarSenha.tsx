"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { Aviso } from "@/components/ui/Exibicao";
import { destinoSeguro } from "@/lib/cliente";
import { useFormulario } from "./useFormulario";

export function FormTrocarSenha() {
  const parametros = useSearchParams();
  const obrigatorio = parametros.get("obrigatorio") === "1";
  const voltar = destinoSeguro(parametros.get("voltar"), "/minha-conta");
  const router = useRouter();
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erroConfirmacao, setErroConfirmacao] = useState<string>();
  const [pronto, setPronto] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmacao) {
      setErroConfirmacao("As duas senhas não são iguais.");
      return;
    }
    setErroConfirmacao(undefined);
    const r = await submeter("/api/me/senha", { senhaAtual, novaSenha });
    if (!r.ok) return;
    if (obrigatorio) {
      router.replace(voltar);
      router.refresh();
    } else {
      setPronto(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
    }
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={aoEnviar} noValidate>
      {obrigatorio && (
        <Aviso tipo="info" titulo="Crie a sua senha antes de continuar.">
          Esta conta foi criada com uma senha provisória.
        </Aviso>
      )}
      {pronto && (
        <Aviso tipo="sucesso" titulo="Senha alterada.">
          As sessões em outros aparelhos foram encerradas.
        </Aviso>
      )}
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <CampoSenha
        id="senha-atual"
        rotulo={obrigatorio ? "Senha provisória" : "Senha atual"}
        autoComplete="current-password"
        required
        value={senhaAtual}
        onChange={(e) => {
          setSenhaAtual(e.target.value);
          limparErro("senhaAtual");
        }}
        erro={erros.senhaAtual}
      />
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

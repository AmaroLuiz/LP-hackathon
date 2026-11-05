"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Caixa } from "@/components/ui/Caixa";
import { Campo } from "@/components/ui/Campo";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { Aviso } from "@/components/ui/Exibicao";
import { destinoSeguro } from "@/lib/cliente";
import { useFormulario } from "./useFormulario";

export function FormCadastro() {
  const router = useRouter();
  const voltar = destinoSeguro(useSearchParams().get("voltar"), "/boas-vindas");
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceitouMarketing, setAceitouMarketing] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter("/api/auth/cadastro", { nome, email, senha, aceitouTermos, aceitouMarketing });
    if (r.ok) {
      router.replace(voltar);
      router.refresh();
    }
  }

  const sufixo = voltar === "/boas-vindas" ? "" : `?voltar=${encodeURIComponent(voltar)}`;

  return (
    <form ref={formulario} className="formulario" onSubmit={aoEnviar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <Campo
        id="nome"
        rotulo="Seu nome"
        autoComplete="name"
        required
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          limparErro("nome");
        }}
        erro={erros.nome}
      />
      <Campo
        id="email"
        rotulo="E-mail"
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
        ajuda="Enviamos um link para confirmar."
      />
      <CampoSenha
        id="senha"
        rotulo="Crie uma senha"
        autoComplete="new-password"
        required
        medidor
        value={senha}
        onChange={(e) => {
          setSenha(e.target.value);
          limparErro("senha");
        }}
        erro={erros.senha}
        ajuda="No mínimo 10 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar."
      />
      <Caixa
        id="termos"
        required
        checked={aceitouTermos}
        onChange={(e) => {
          setAceitouTermos(e.target.checked);
          limparErro("aceitouTermos");
        }}
        erro={erros.aceitouTermos}
      >
        Li e aceito os{" "}
        <Link href="/termos" className="link link--sublinhado" target="_blank">
          termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="link link--sublinhado" target="_blank">
          política de privacidade
        </Link>
        .
      </Caixa>
      <Caixa id="marketing" checked={aceitouMarketing} onChange={(e) => setAceitouMarketing(e.target.checked)}>
        Quero receber novidades e cursos novos por e-mail (opcional).
      </Caixa>
      <Botao type="submit" largo carregando={enviando} textoCarregando="Criando sua conta…">
        Criar conta
      </Botao>
      <p className="formulario__rodape">
        Já tem conta?{" "}
        <Link href={`/entrar${sufixo}`} className="link link--sublinhado">
          Entrar
        </Link>
      </p>
    </form>
  );
}

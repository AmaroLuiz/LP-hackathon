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

export function FormEntrar() {
  const router = useRouter();
  const voltar = destinoSeguro(useSearchParams().get("voltar"));
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter<{ deveTrocarSenha: boolean }>("/api/auth/entrar", { email, senha, lembrar });
    if (r.ok) {
      router.replace(r.dados.deveTrocarSenha ? `/minha-conta/senha?obrigatorio=1&voltar=${encodeURIComponent(voltar)}` : voltar);
      router.refresh();
    }
  }

  const sufixo = voltar !== "/" ? `?voltar=${encodeURIComponent(voltar)}` : "";

  return (
    <form ref={formulario} className="formulario" onSubmit={aoEnviar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
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
      />
      <CampoSenha
        id="senha"
        rotulo="Senha"
        autoComplete="current-password"
        required
        value={senha}
        onChange={(e) => {
          setSenha(e.target.value);
          limparErro("senha");
        }}
        erro={erros.senha}
      />
      <div className="formulario__linha">
        <Caixa id="lembrar" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)}>
          Continuar conectado por 30 dias
        </Caixa>
        <Link href="/esqueci-senha" className="link link--sublinhado formulario__link">
          Esqueci minha senha
        </Link>
      </div>
      <Botao type="submit" largo carregando={enviando} textoCarregando="Entrando…">
        Entrar
      </Botao>
      <p className="formulario__rodape">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro${sufixo}`} className="link link--sublinhado">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

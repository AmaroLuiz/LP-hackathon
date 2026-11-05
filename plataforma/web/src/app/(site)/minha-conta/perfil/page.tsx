import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { FormPerfil, FormTrocarEmail, Privacidade, SessoesAtivas } from "@/components/conta/Perfil";
import { Esqueleto } from "@/components/ui/Exibicao";
import { exigirUsuario, pedirComSessao, type SessaoAtiva } from "@/lib/sessao";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };

async function Conteudo() {
  const usuario = await exigirUsuario("/minha-conta/perfil");
  const sessoes = await pedirComSessao<SessaoAtiva[]>("/api/me/sessoes");
  return (
    <div className="perfil">
      <FormPerfil usuario={usuario} />
      <FormTrocarEmail usuario={usuario} />
      <section className="perfil__bloco" aria-labelledby="perfil-senha">
        <h2 id="perfil-senha" className="perfil__titulo">
          Senha
        </h2>
        <p className="perfil__texto">
          Trocar a senha encerra as sessões nos outros aparelhos.{" "}
          <Link href="/minha-conta/senha" className="link link--sublinhado">
            Trocar senha
          </Link>
        </p>
      </section>
      <SessoesAtivas inicial={sessoes.ok ? sessoes.dados : []} />
      <Privacidade email={usuario.email} />
    </div>
  );
}

export default function PaginaPerfil() {
  return (
    <MolduraConta titulo="Perfil">
      <Suspense fallback={<Esqueleto altura="24rem" />}>
        <Conteudo />
      </Suspense>
    </MolduraConta>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { Marca } from "@/components/Cabecalho";
import { NavAdmin, NavAdminCarregando } from "@/components/admin/NavAdmin";
import { BotaoSair } from "@/components/conta/BotaoSair";
import { ProvedorAvisos } from "@/components/ui/Avisos";
import { obterUsuarioSeDisponivel } from "@/lib/sessao";

/** Quem está no painel, embaixo da navegação. */
async function ContaAdmin() {
  const usuario = await obterUsuarioSeDisponivel();
  if (!usuario) return null;
  return (
    <div className="painel__conta">
      <p className="painel__nome">{usuario.nome}</p>
      <p className="painel__email">{usuario.email}</p>
      <BotaoSair className="painel__sair" />
    </div>
  );
}

/**
 * Painel admin: chão creme, navegação lateral fixa, sem o cabeçalho da vitrine.
 * Cada página confere o papel no servidor (exigirAdmin); a API confere de novo.
 */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorAvisos>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="painel" data-chao="papel">
        <aside className="painel__lateral">
          <div className="painel__marca">
            <Marca />
            <span className="painel__selo">Painel</span>
          </div>
          <Suspense fallback={<NavAdminCarregando />}>
            <NavAdmin />
          </Suspense>
          <div className="painel__pe">
            <Link href="/" className="painel__site">
              Ver o site
            </Link>
            <Suspense fallback={null}>
              <ContaAdmin />
            </Suspense>
          </div>
        </aside>
        <main id="conteudo" className="painel__principal">
          {children}
        </main>
      </div>
    </ProvedorAvisos>
  );
}

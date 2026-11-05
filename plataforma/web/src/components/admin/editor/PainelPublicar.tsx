"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso, Esqueleto } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import type { Checklist, CursoEdicao } from "@/lib/admin";
import { enviar } from "@/lib/cliente";

/** Em qual aba se resolve cada item do checklist. */
const ABA_DO_ITEM: Record<string, string> = {
  titulo: "pagina",
  descricao: "pagina",
  oQueAprende: "pagina",
  resultado: "pagina",
  instrutor: "pagina",
  capa: "capa",
  capaAlt: "capa",
  curriculo: "curriculo",
  videos: "curriculo",
  duracao: "curriculo",
  previa: "curriculo",
  plano: "acesso",
};

/**
 * Publicar, despublicar, arquivar e duplicar. A publicação só libera quando o
 * checklist obrigatório está completo (a API confere de novo).
 */
export function PainelPublicar({
  curso,
  versao,
  pendente,
  aoMudar,
  irPara,
}: {
  curso: CursoEdicao;
  /** Muda a cada alteração salva: o checklist é relido. */
  versao: number;
  /** Há alterações da página ainda não salvas. */
  pendente: boolean;
  aoMudar: (curso: CursoEdicao) => void;
  irPara: (aba: string) => void;
}) {
  const [lista, setLista] = useState<Checklist | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();
  const router = useRouter();

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/cursos/${curso.id}/checklist`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((dados: Checklist | null) => vivo && setLista(dados))
      .catch(() => vivo && setLista(null));
    return () => {
      vivo = false;
    };
  }, [curso.id, versao]);

  async function acao(nome: "publicar" | "despublicar" | "arquivar" | "duplicar", feito: string) {
    setOcupado(true);
    setErro(null);
    const r = await enviar<CursoEdicao>(`/api/admin/cursos/${curso.id}/${nome}`, {});
    setOcupado(false);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    avisar(feito);
    if (nome === "duplicar") {
      router.push(`/admin/cursos/${r.dados.id}`);
      return;
    }
    aoMudar(r.dados);
    router.refresh();
  }

  const obrigatorios = lista?.itens.filter((i) => i.obrigatorio) ?? [];
  const avisos = lista?.itens.filter((i) => !i.obrigatorio) ?? [];
  const faltam = obrigatorios.filter((i) => !i.ok).length;

  return (
    <div className="publicar">
      {dialogo}
      <section aria-labelledby="checklist-titulo" className="publicar__lista">
        <h3 id="checklist-titulo" className="painel-bloco__subtitulo">
          Antes de publicar
        </h3>
        {!lista ? (
          <Esqueleto altura="12rem" />
        ) : (
          <>
            <p className="painel-bloco__apoio" aria-live="polite">
              {faltam === 0 ? "Tudo o que é obrigatório está pronto." : `Falta${faltam === 1 ? "" : "m"} ${faltam} ${faltam === 1 ? "item obrigatório" : "itens obrigatórios"}.`}
            </p>
            <ul className="checklist">
              {obrigatorios.map((i) => (
                <ItemLista key={i.id} ok={i.ok} texto={i.texto} aoIr={() => irPara(ABA_DO_ITEM[i.id] ?? "pagina")} />
              ))}
            </ul>
            <h4 className="checklist__titulo">Recomendado</h4>
            <ul className="checklist checklist--avisos">
              {avisos.map((i) => (
                <ItemLista key={i.id} ok={i.ok} texto={i.texto} aviso aoIr={() => irPara(ABA_DO_ITEM[i.id] ?? "curriculo")} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="estado-titulo" className="publicar__acoes">
        <h3 id="estado-titulo" className="painel-bloco__subtitulo">
          {curso.status === "PUBLICADO" ? "O curso está no ar" : curso.status === "ARQUIVADO" ? "O curso está arquivado" : "O curso é um rascunho"}
        </h3>
        {pendente && <Aviso tipo="info" titulo="Há alterações não salvas na página do curso. Salve antes de publicar." />}
        {erro && <Aviso tipo="erro" titulo={erro} />}
        <div className="acoes">
          {curso.status !== "PUBLICADO" && (
            <Botao disabled={ocupado || pendente || !lista?.podePublicar} onClick={() => acao("publicar", "Curso publicado. Já aparece no catálogo.")}>
              {curso.status === "ARQUIVADO" ? "Publicar de novo" : "Publicar curso"}
            </Botao>
          )}
          {curso.status === "PUBLICADO" && (
            <BotaoLink href={`/cursos/${curso.slug}`} variante="secundario" target="_blank">
              Ver no site
            </BotaoLink>
          )}
          {curso.status !== "RASCUNHO" && (
            <Botao
              variante="secundario"
              disabled={ocupado}
              onClick={async () => {
                const ok =
                  curso.status !== "PUBLICADO" ||
                  (await confirmar({
                    titulo: "Tirar o curso do ar?",
                    texto: "O curso sai do catálogo e os alunos deixam de abrir as aulas até você publicar de novo. O progresso deles fica guardado.",
                    confirmar: "Voltar para rascunho",
                  }));
                if (ok) void acao("despublicar", "O curso voltou para rascunho.");
              }}
            >
              Voltar para rascunho
            </Botao>
          )}
          <Botao variante="secundario" disabled={ocupado} onClick={() => acao("duplicar", "Cópia criada como rascunho.")}>
            Duplicar curso
          </Botao>
          {curso.status !== "ARQUIVADO" && (
            <Botao
              variante="perigo"
              disabled={ocupado}
              onClick={async () => {
                const ok = await confirmar({
                  titulo: `Arquivar "${curso.titulo}"?`,
                  texto: "O curso sai do site e da home, e os alunos deixam de abrir as aulas. Certificados já emitidos continuam válidos. Dá para publicar de novo depois.",
                  confirmar: "Arquivar curso",
                  perigo: true,
                });
                if (ok) void acao("arquivar", "Curso arquivado.");
              }}
            >
              Arquivar
            </Botao>
          )}
        </div>
      </section>
    </div>
  );
}

function ItemLista({ ok, texto, aviso, aoIr }: { ok: boolean; texto: string; aviso?: boolean; aoIr: () => void }) {
  return (
    <li className={`checklist__item${ok ? " is-ok" : aviso ? " is-aviso" : " is-falta"}`}>
      <span className="checklist__marca" aria-hidden="true">
        <Icone nome={ok ? "feito" : "alerta"} tamanho={16} />
      </span>
      <span className="checklist__texto">
        {texto}
        <span className="sr-only">{ok ? ": pronto" : aviso ? ": recomendado" : ": falta"}</span>
      </span>
      {!ok && (
        <button type="button" className="link link--sublinhado" onClick={aoIr}>
          Resolver<span className="sr-only"> {texto}</span>
        </button>
      )}
    </li>
  );
}

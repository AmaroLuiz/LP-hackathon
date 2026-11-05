import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AcoesUsuario, ConcederAcesso, RevogarAcesso } from "@/components/admin/AcoesUsuario";
import { BarraProgresso, Esqueleto, Selo } from "@/components/ui/Exibicao";
import { nomeDaAcao, type CursoLinha, type FichaUsuario } from "@/lib/admin";
import { listarPlanos } from "@/lib/api";
import { buscarComSessao, exigirAdmin, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Usuário · Painel", robots: { index: false } };

const dataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

const STATUS_ASSINATURA = {
  PENDENTE: "Esperando pagamento",
  ATIVA: "Ativa",
  EM_ATRASO: "Pagamento atrasado",
  CANCELADA: "Cancelada",
  EXPIRADA: "Expirada",
} as const;

const OBJETIVOS: Record<string, string> = {
  POSTAR_MAIS: "Postar com constância",
  VIDEOS: "Fazer vídeos",
  ARTES: "Criar artes e carrosséis",
  VENDER_MAIS: "Vender mais pelas redes",
};

const FAMILIARIDADE: Record<string, string> = {
  NUNCA_USEI: "Nunca usou IA",
  JA_USEI: "Já usou algumas vezes",
  USO_SEMPRE: "Usa com frequência",
};

function quando(iso: string | null | undefined) {
  return iso ? dataHora.format(new Date(iso)) : "—";
}

async function Conteudo({ params }: { params: PageProps<"/admin/usuarios/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const eu = await exigirAdmin(`/admin/usuarios/${id}`);
  const ficha = await pedirComSessao<FichaUsuario>(`/api/admin/usuarios/${id}`);
  if (!ficha.ok) notFound();
  const [cursos, planos] = await Promise.all([buscarComSessao<CursoLinha[]>("/api/admin/cursos"), listarPlanos()]);
  const { conta, assinatura, acessos, historico } = ficha.dados;

  return (
    <>
      <header className="painel-topo">
        <p className="olho">
          <Link href="/admin/usuarios" className="link">
            Usuários
          </Link>{" "}
          / Ficha
        </p>
        <h1 className="painel-topo__titulo">{conta.nome}</h1>
        <p className="editor__meta">
          {conta.papel === "ADMIN" ? <Selo tom="ouro">Admin</Selo> : <Selo>Aluno</Selo>}
          {conta.bloqueadoEm ? <Selo tom="erro">Bloqueada desde {data.format(new Date(conta.bloqueadoEm))}</Selo> : null}
          {!conta.emailVerificadoEm && <Selo>E-mail sem confirmar</Selo>}
        </p>
      </header>

      <section className="painel-bloco" aria-labelledby="u-acoes">
        <h2 id="u-acoes" className="painel-bloco__titulo">
          Ações
        </h2>
        <AcoesUsuario conta={conta} ehVoce={conta.id === eu.id} />
      </section>

      <div className="editor-grade">
        <section className="painel-bloco" aria-labelledby="u-conta">
          <h2 id="u-conta" className="painel-bloco__titulo">
            Conta
          </h2>
          <dl className="dados-conta dados-conta--densa">
            <div>
              <dt>E-mail</dt>
              <dd>{conta.email}</dd>
            </div>
            <div>
              <dt>Confirmado em</dt>
              <dd>{quando(conta.emailVerificadoEm)}</dd>
            </div>
            <div>
              <dt>Cadastro</dt>
              <dd>{quando(conta.criadoEm)}</dd>
            </div>
            <div>
              <dt>Último acesso</dt>
              <dd>{quando(conta.ultimoAcessoEm)}</dd>
            </div>
            <div>
              <dt>Negócio</dt>
              <dd>{[conta.nomeNegocio, conta.segmentoNegocio].filter(Boolean).join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt>Objetivo</dt>
              <dd>{conta.objetivo ? OBJETIVOS[conta.objetivo] ?? conta.objetivo : "—"}</dd>
            </div>
            <div>
              <dt>Com IA</dt>
              <dd>{conta.familiaridade ? FAMILIARIDADE[conta.familiaridade] ?? conta.familiaridade : "—"}</dd>
            </div>
            <div>
              <dt>E-mails de novidades</dt>
              <dd>{conta.aceitouMarketing ? "Aceitou" : "Não aceitou"}</dd>
            </div>
            <div>
              <dt>Termos aceitos em</dt>
              <dd>{quando(conta.aceitouTermosEm)}</dd>
            </div>
          </dl>
          <h3 className="painel-bloco__subtitulo">Sessões abertas</h3>
          {conta.sessoes.length === 0 ? (
            <p className="painel-bloco__apoio">Nenhuma sessão aberta.</p>
          ) : (
            <ul className="lista-simples">
              {conta.sessoes.map((s, i) => (
                <li key={i}>
                  Aberta em {quando(s.criadaEm)} · último uso {quando(s.ultimoUso)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="painel-bloco" aria-labelledby="u-assinatura">
          <h2 id="u-assinatura" className="painel-bloco__titulo">
            Assinatura e acessos
          </h2>
          {assinatura ? (
            <dl className="dados-conta dados-conta--densa">
              <div>
                <dt>Plano</dt>
                <dd>{assinatura.planoNome}</dd>
              </div>
              <div>
                <dt>Situação</dt>
                <dd>
                  <Selo tom={assinatura.daAcesso ? "salvia" : "neutro"}>{STATUS_ASSINATURA[assinatura.status]}</Selo>
                </dd>
              </div>
              <div>
                <dt>Período atual até</dt>
                <dd>{quando(assinatura.fimPeriodoAtual)}</dd>
              </div>
            </dl>
          ) : null}
          {assinatura ? (
            <Link href={`/admin/assinaturas/${assinatura.id}`} className="link link--sublinhado">
              Ver cobranças e eventos da assinatura
            </Link>
          ) : (
            <p className="painel-bloco__apoio">Nunca assinou.</p>
          )}

          <h3 className="painel-bloco__subtitulo">Acessos manuais</h3>
          {acessos.length === 0 ? (
            <p className="painel-bloco__apoio">Nenhum acesso concedido pela equipe.</p>
          ) : (
            <ul className="lista-simples">
              {acessos.map((a) => {
                const alvo = a.curso ? `Curso "${a.curso}"` : `Plano ${a.plano ?? a.planoId}`;
                return (
                  <li key={a.id} className={a.vigente ? undefined : "is-apagado"}>
                    <strong>{alvo}</strong> · {a.motivo}
                    <span className="tabela__detalhe">
                      Por {a.concedidoPor} em {data.format(new Date(a.criadoEm))}
                      {a.expiraEm ? ` · ${a.vigente ? "vale até" : "venceu em"} ${data.format(new Date(a.expiraEm))}` : " · sem prazo"}
                    </span>
                    <RevogarAcesso usuarioId={conta.id} acessoId={a.id} descricao={`${alvo} (${a.motivo})`} />
                  </li>
                );
              })}
            </ul>
          )}
          <ConcederAcesso usuarioId={conta.id} cursos={cursos.map((c) => ({ id: c.id, titulo: c.titulo }))} planos={planos.map((p) => ({ id: p.id, nome: p.nome }))} />
        </section>
      </div>

      <section className="painel-bloco" aria-labelledby="u-cursos">
        <h2 id="u-cursos" className="painel-bloco__titulo">
          Cursos e progresso
        </h2>
        {ficha.dados.cursos.length === 0 ? (
          <p className="painel-bloco__apoio">Ainda não começou nenhum curso.</p>
        ) : (
          <ul className="progresso-cursos">
            {ficha.dados.cursos.map(({ card, matricula }) => (
              <li key={card.id}>
                <span className="progresso-cursos__titulo">
                  {card.titulo}
                  {matricula.concluido && <Selo tom="salvia">Concluído</Selo>}
                </span>
                <BarraProgresso valor={matricula.percentual} rotulo={`Progresso em ${card.titulo}`} />
                <span className="tabela__detalhe">
                  {matricula.aulasConcluidas} de {matricula.totalAulas} aulas · começou em {data.format(new Date(matricula.iniciadaEm))}
                  {matricula.certificadoCodigo && ` · certificado ${matricula.certificadoCodigo}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel-bloco" aria-labelledby="u-historico">
        <h2 id="u-historico" className="painel-bloco__titulo">
          Histórico
        </h2>
        {historico.length === 0 ? (
          <p className="painel-bloco__apoio">Nada registrado ainda.</p>
        ) : (
          <ol className="linha-do-tempo">
            {historico.map((h) => (
              <li key={h.id}>
                <time dateTime={h.quando}>{quando(h.quando)}</time>
                <span>
                  <strong>{nomeDaAcao(h.acao)}</strong> · {h.resumo}
                  {h.autorEmail && h.autorId !== conta.id && <span className="tabela__detalhe">por {h.autorEmail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
        <Link href={`/admin/auditoria?alvoTipo=usuario&alvoId=${conta.id}`} className="link link--sublinhado">
          Ver tudo na auditoria
        </Link>
      </section>
    </>
  );
}

export default function FichaDoUsuario(props: PageProps<"/admin/usuarios/[id]">) {
  return (
    <section className="painel-pagina" aria-label="Ficha do usuário">
      <Suspense fallback={<Esqueleto altura="30rem" />}>
        <Conteudo params={props.params} />
      </Suspense>
    </section>
  );
}

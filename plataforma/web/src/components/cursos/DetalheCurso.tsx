import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BotaoCompartilhar } from "@/components/cursos/BotaoCompartilhar";
import { BotaoPrevia } from "@/components/cursos/BotaoPrevia";
import { Acordeao, Estrelas, EstadoVazio, Selo } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { TextoMarkdown } from "@/components/ui/TextoMarkdown";
import { planoMinimo, type CursoDetalhe, type Plano } from "@/lib/api";
import { atualizadoEm, duracao, NIVEIS, plural, preco } from "@/lib/formato";

/**
 * A página do curso (cabeçalho com o cartão de acesso e o corpo). Usada pela
 * vitrine e pela pré-visualização do painel; quem chama decide o que vai no
 * cartão (`acesso`), que depende de quem está vendo.
 */
export function DetalheCurso({
  curso,
  planos,
  acesso,
  avaliacoes,
}: {
  curso: CursoDetalhe;
  planos: Plano[];
  acesso: ReactNode;
  /** Lista completa (vitrine). Sem ela, só o resumo (pré-visualização do painel). */
  avaliacoes?: ReactNode;
}) {
  const { card } = curso;
  const plano = planoMinimo(planos, card.id);
  const planosDoCurso = planos.filter((p) => p.cursos.includes(card.id));
  const totalAulas = curso.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const totalPrevias = curso.modulos.reduce((n, m) => n + m.aulas.filter((a) => a.previa).length, 0);
  const primeiraPrevia = curso.modulos.flatMap((m) => m.aulas).find((a) => a.previa);

  return (
    <>
      <section className="secao curso-topo" data-chao="preto" aria-labelledby="curso-titulo">
        <div className="curso-topo__grade">
          <div>
            <nav className="trilha-nav" aria-label="Você está em">
              <Link href="/cursos" className="link">
                Cursos
              </Link>
              <span aria-hidden="true"> / </span>
              <Link href={`/cursos?categoria=${card.categoria.slug}`} className="link">
                {card.categoria.nome}
              </Link>
            </nav>
            <h1 id="curso-titulo" className="titulo curso-topo__titulo">
              {card.titulo}
              <span className="expoente-titulo" aria-hidden="true">
                {card.numero}
              </span>
            </h1>
            <p className="curso-topo__subtitulo">{card.subtitulo}</p>
            <ul className="curso-topo__meta">
              <li>
                {card.totalAvaliacoes > 0 ? (
                  <a href="#avaliacoes" className="link">
                    <Estrelas nota={card.notaMedia} total={card.totalAvaliacoes} />
                  </a>
                ) : (
                  <Selo tom="ouro">Curso novo</Selo>
                )}
              </li>
              {card.totalAlunos > 0 && <li>{plural(card.totalAlunos, "aluno", "alunos")}</li>}
              <li>{NIVEIS[card.nivel]}</li>
              <li>{card.totalAulas > 0 ? `${duracao(card.duracaoTotalSegundos)} de aula` : "Aulas em gravação"}</li>
              <li>Atualizado em {atualizadoEm(curso.atualizadoEm)}</li>
              <li>Português</li>
            </ul>
            <p className="curso-topo__por">
              Criado por{" "}
              <a href="#instrutores" className="link">
                <strong>{card.instrutores.join(", ")}</strong>
              </a>
            </p>
          </div>

          <aside className="curso-cartao" aria-label="Acesso ao curso">
            <div className="curso-cartao__capa">
              {card.capaUrl && <Image src={card.capaUrl} alt={card.capaAlt ?? ""} fill sizes="(min-width: 64em) 24rem, 92vw" priority />}
            </div>
            <div className="curso-cartao__corpo">
              {plano ? (
                <p className="curso-cartao__plano">
                  Incluído no plano <strong>{plano.nome}</strong>
                  <span className="curso-cartao__preco">
                    a partir de {preco(plano.precoCentavos)}
                    <small>/mês</small>
                  </span>
                </p>
              ) : (
                <p className="curso-cartao__plano">Em breve em um dos planos.</p>
              )}
              {acesso}
              <p className="curso-cartao__inclui-titulo">Este curso inclui</p>
              <ul className="curso-cartao__inclui">
                <li>
                  {totalAulas > 0
                    ? `${plural(totalAulas, "aula", "aulas")}${card.duracaoTotalSegundos > 0 ? ` · ${duracao(card.duracaoTotalSegundos)} de vídeo` : ""}`
                    : "Aulas novas assim que ficam prontas"}
                </li>
                {totalPrevias > 0 && <li>{plural(totalPrevias, "aula de prévia grátis", "aulas de prévia grátis")}</li>}
                <li>Acesso no computador e no celular</li>
                <li>Atualizações sem custo enquanto a assinatura estiver ativa</li>
                {curso.certificadoHabilitado && <li>Certificado de conclusão</li>}
              </ul>
              <div className="curso-cartao__extras">
                {primeiraPrevia && (
                  <BotaoPrevia aulaId={primeiraPrevia.id} titulo={primeiraPrevia.titulo} rotulo="Assistir prévia grátis" className="botao botao--fantasma botao--pequeno compartilhar" />
                )}
                <BotaoCompartilhar titulo={card.titulo} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="secao" data-chao="papel" aria-label="Sobre o curso">
        <div className="curso-corpo">
          <div className="curso-bloco curso-bloco--destaque">
            <h2 className="rotulo">Ao final, você terá</h2>
            <p className="curso-resultado">{curso.resultadoFinal}</p>
          </div>

          {curso.oQueAprende.length > 0 && (
            <div className="curso-bloco curso-bloco--caixa">
              <h2 className="subtitulo">O que você vai aprender</h2>
              <ul className="lista-marcada lista-marcada--duas">
                {curso.oQueAprende.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {curso.ferramentas.length > 0 && (
            <div className="curso-bloco">
              <h2 className="subtitulo">Ferramentas usadas</h2>
              <ul className="ferramentas">
                {curso.ferramentas.map((f) => (
                  <li key={f}>
                    <Link href={`/cursos?ferramenta=${encodeURIComponent(f)}`}>{f}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="curso-bloco">
            <h2 className="subtitulo">Conteúdo do curso</h2>
            {curso.modulos.length > 0 ? (
              <>
                <p className="curso-bloco__resumo">
                  {plural(curso.modulos.length, "módulo", "módulos")} · {plural(totalAulas, "aula", "aulas")}
                  {card.duracaoTotalSegundos > 0 && ` · ${duracao(card.duracaoTotalSegundos)} no total`}
                </p>
                <div className="acordeoes">
                  {curso.modulos.map((m, i) => (
                    <Acordeao
                      key={m.ordem}
                      titulo={m.titulo}
                      detalhe={`${plural(m.aulas.length, "aula", "aulas")} · ${duracao(m.aulas.reduce((s, a) => s + (a.duracaoSegundos ?? 0), 0))}`}
                      aberto={i === 0}
                    >
                      {m.descricao && <p className="acordeao__descricao">{m.descricao}</p>}
                      <ol className="aulas-lista">
                        {m.aulas.map((a) => (
                          <li key={a.id} className="aula-item">
                            <span className="aula-item__icone" aria-hidden="true">
                              <Icone nome={a.previa ? "play" : "cadeado"} tamanho={16} />
                            </span>
                            {a.previa ? (
                              <BotaoPrevia aulaId={a.id} titulo={a.titulo} className="aula-item__titulo aula-item__previa" />
                            ) : (
                              <span className="aula-item__titulo">
                                {a.titulo}
                                <span className="sr-only"> (para assinantes)</span>
                              </span>
                            )}
                            {a.previa && <Selo tom="salvia">Prévia grátis</Selo>}
                            <span className="aula-item__duracao">{a.duracaoSegundos ? duracao(a.duracaoSegundos) : ""}</span>
                          </li>
                        ))}
                      </ol>
                    </Acordeao>
                  ))}
                </div>
              </>
            ) : (
              <EstadoVazio titulo="As aulas deste curso estão sendo gravadas.">Quem assina recebe cada aula assim que fica pronta.</EstadoVazio>
            )}
          </div>

          {curso.requisitos.length > 0 && (
            <div className="curso-bloco">
              <h2 className="subtitulo">Requisitos</h2>
              <ul className="lista-marcada">
                {curso.requisitos.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {curso.descricao && (
            <div className="curso-bloco">
              <h2 className="subtitulo">Descrição</h2>
              <TextoMarkdown texto={curso.descricao} />
            </div>
          )}

          {curso.paraQuemE.length > 0 && (
            <div className="curso-bloco">
              <h2 className="subtitulo">Para quem é este curso</h2>
              <ul className="lista-marcada">
                {curso.paraQuemE.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="curso-bloco" id="instrutores">
            <h2 className="subtitulo">Quem ensina</h2>
            {curso.instrutores.map((i) => (
              <div key={i.nome} className="instrutor">
                {i.fotoUrl ? (
                  <span className="instrutor__avatar instrutor__avatar--foto">
                    <Image src={i.fotoUrl} alt="" fill sizes="4rem" />
                  </span>
                ) : (
                  <span className="instrutor__avatar" aria-hidden="true">
                    {i.nome
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                )}
                <div>
                  <p className="instrutor__nome">{i.nome}</p>
                  {i.titulo && <p className="instrutor__titulo">{i.titulo}</p>}
                  {i.bio && <p className="instrutor__bio">{i.bio}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="curso-bloco" id="avaliacoes">
            <h2 className="subtitulo">Avaliações</h2>
            {avaliacoes ?? (card.totalAvaliacoes > 0 ? (
              <Estrelas nota={card.notaMedia} total={card.totalAvaliacoes} />
            ) : (
              <p className="curso-bloco__resumo">Este curso ainda não tem avaliações. Elas aparecem aqui assim que os primeiros alunos concluírem.</p>
            ))}
          </div>

          {planosDoCurso.length > 0 && (
            <p className="curso-planos">
              Incluído {planosDoCurso.length === 1 ? "no plano" : "nos planos"} {planosDoCurso.map((p) => p.nome).join(", ")}.{" "}
              <Link href={`/planos?curso=${card.slug}`} className="link link--sublinhado">
                Comparar planos
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}

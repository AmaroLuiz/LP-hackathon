import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarrasHorizontais, ColunasPorDia, Indicador } from "@/components/admin/Graficos";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { Metricas } from "@/lib/admin";
import { inteiro, preco } from "@/lib/formato";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Visão geral · Painel", robots: { index: false } };

const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-11" → "novembro de 2026". */
function mesAno(mes: string) {
  return nomeMes.format(new Date(`${mes}-15T12:00:00Z`));
}

const horario = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

async function Conteudo() {
  await exigirAdmin("/admin");
  const m = await buscarComSessao<Metricas>("/api/admin/metricas");
  const pctVerificados = m.alunos > 0 ? Math.round((m.verificados / m.alunos) * 100) : 0;

  return (
    <>
      <p className="painel-topo__nota">Atualizado às {horario.format(new Date(m.geradoEm))}. Recarregue a página para ver os números de agora.</p>

      <section className="painel-bloco" aria-labelledby="vg-alunos">
        <h2 id="vg-alunos" className="painel-bloco__titulo">
          Alunos
        </h2>
        <div className="indicadores">
          <Indicador rotulo="Alunos estudando (7 dias)" valor={inteiro(m.ativos7)} detalhe={`${inteiro(m.ativos30)} nos últimos 30 dias`} />
          <Indicador rotulo="Contas de aluno" valor={inteiro(m.alunos)} detalhe={`${pctVerificados}% com e-mail confirmado`} />
          <Indicador rotulo="Novos cadastros (7 dias)" valor={inteiro(m.novos7)} detalhe={`${inteiro(m.novos30)} nos últimos 30 dias`} />
        </div>
        <h3 className="painel-bloco__subtitulo">Cadastros por dia, últimos 30 dias</h3>
        <ColunasPorDia
          titulo="Cadastros por dia, últimos 30 dias"
          dias={m.cadastrosPorDia.map((d) => ({ rotulo: diaMes.format(new Date(`${d.dia}T00:00:00Z`)), valor: d.cadastros }))}
        />
      </section>

      <section className="painel-bloco" aria-labelledby="vg-assinaturas">
        <h2 id="vg-assinaturas" className="painel-bloco__titulo">
          Assinaturas
        </h2>
        <div className="indicadores">
          <Indicador rotulo="Assinaturas ativas" valor={inteiro(m.assinaturasAtivas)} detalhe={`${inteiro(m.fundadores)} com a condição de fundador`} />
          <Indicador rotulo="Receita recorrente mensal" valor={preco(m.receitaMensalCentavos)} detalhe="Soma das próximas cobranças, com os descontos" />
          <Indicador rotulo="Recebido neste mês" valor={preco(m.receitaConfirmadaNoMesCentavos)} detalhe="Cobranças confirmadas desde o dia 1º" />
          <Indicador
            rotulo="Pagamento atrasado"
            valor={inteiro(m.emAtraso)}
            detalhe={<Link href="/admin/assinaturas?status=EM_ATRASO" className="link link--sublinhado">Ver quem está</Link>}
          />
          <Indicador rotulo="Cancelamentos no mês" valor={inteiro(m.cancelamentosNoMes)} />
        </div>
        <h3 className="painel-bloco__subtitulo">Recebido por mês, últimos 6 meses</h3>
        <BarrasHorizontais
          titulo="Recebido por mês, últimos 6 meses"
          barras={m.receitaPorMes.map((r) => ({ rotulo: mesAno(r.mes), valor: r.centavos, texto: preco(r.centavos) }))}
          vazio="Nada recebido ainda."
        />
        <h3 className="painel-bloco__subtitulo">Assinaturas ativas por plano</h3>
        <BarrasHorizontais
          titulo="Assinaturas ativas por plano"
          barras={m.ativasPorPlano.map((p) => ({ rotulo: p.nome, valor: p.assinaturas }))}
          vazio="Nenhum plano cadastrado."
        />
      </section>

      <section className="painel-bloco" aria-labelledby="vg-cursos">
        <h2 id="vg-cursos" className="painel-bloco__titulo">
          Cursos
        </h2>
        <h3 className="painel-bloco__subtitulo">Taxa de conclusão</h3>
        <BarrasHorizontais
          titulo="Taxa de conclusão por curso"
          maximo={100}
          barras={m.conclusaoPorCurso.map((c) => ({
            rotulo: `${c.numero} · ${c.titulo}`,
            valor: c.taxa,
            texto: `${c.taxa}% (${c.concluidas} de ${c.matriculas})`,
          }))}
          vazio="Nenhum aluno começou um curso ainda."
        />

        <h3 className="painel-bloco__subtitulo">Onde os alunos param</h3>
        <p className="painel-bloco__apoio">Última aula aberta por quem não volta ao curso há 14 dias ou mais.</p>
        {m.aulasParadas.length > 0 ? (
          <div className="tabela-moldura">
            <table className="tabela tabela--densa">
              <caption className="sr-only">Aulas onde os alunos param</caption>
              <thead>
                <tr>
                  <th scope="col">Aula</th>
                  <th scope="col">Curso</th>
                  <th scope="col" className="tabela__numero">
                    Alunos parados
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.aulasParadas.map((a) => (
                  <tr key={a.aulaId}>
                    <td>{a.aula}</td>
                    <td>{a.curso}</td>
                    <td className="tabela__numero">{a.alunos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="grafico__vazio">Ninguém parado há mais de 14 dias. Bom sinal.</p>
        )}
      </section>

      <p className="nota-fase">
        <Link href="/admin/avaliacoes" className="link link--sublinhado">
          Moderar avaliações
        </Link>{" "}
        ·{" "}
        <Link href="/admin/perguntas" className="link link--sublinhado">
          Responder perguntas
        </Link>{" "}
        ·{" "}
        <Link href="/admin/auditoria" className="link link--sublinhado">
          Ver as últimas ações no painel
        </Link>
      </p>
    </>
  );
}

export default function VisaoGeral() {
  return (
    <section className="painel-pagina" aria-labelledby="admin-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="admin-titulo" className="painel-topo__titulo">
          Visão geral
        </h1>
      </header>
      <Suspense
        fallback={
          <div className="indicadores" aria-busy="true">
            <Esqueleto altura="7rem" />
            <Esqueleto altura="7rem" />
            <Esqueleto altura="7rem" />
          </div>
        }
      >
        <Conteudo />
      </Suspense>
    </section>
  );
}

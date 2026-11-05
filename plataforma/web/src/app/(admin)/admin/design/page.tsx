import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CardCurso } from "@/components/cursos/CardCurso";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Acordeao, Aviso, BarraProgresso, EstadoVazio, Esqueleto, Estrelas, Selo } from "@/components/ui/Exibicao";
import { listarCursos, listarPlanos, planoMinimo } from "@/lib/api";
import { exigirAdmin } from "@/lib/sessao";
import { Paginacao } from "@/components/ui/Paginacao";
import { DemoCampos } from "./DemoCampos";
import { DemoInterativos } from "./DemoInterativos";

export const metadata: Metadata = { title: "Inventário de componentes", robots: { index: false } };

const CORES = [
  ["--preto", "#171E19", "Chão escuro, área do aluno, player"],
  ["--grafite", "#1F2822", "Superfície no escuro"],
  ["--carvao", "#2A342D", "Segundo tom no escuro, fundo de imagem"],
  ["--papel", "#F6F1E7", "Chão claro, painel admin"],
  ["--pedra", "#E7E0D1", "Superfície no claro"],
  ["--texto", "#1A1A1A", "Texto sobre claro"],
  ["--cinza-escuro", "#4E5750", "Texto secundário no claro (6,7:1)"],
  ["--cinza-claro", "#A6ADA2", "Texto secundário no escuro (7,4:1)"],
  ["--ouro", "#F2B705", "Destaque, expoente, estrelas, foco"],
  ["--ouro-texto", "#7A5A00", "Dourado para texto sobre claro (AA)"],
  ["--salvia", "#6B8F71", "Progresso, concluído, fios"],
  ["--erro", "#9A2A1F", "Erros e ações destrutivas"],
] as const;

const TIPOS = [
  ["--passo-titulo", "Título de página", "32–64 px"],
  ["--passo-declaracao", "Declaração", "21–36 px"],
  ["--passo-destaque", "Destaque e títulos de card", "20–24 px"],
  ["--passo-corpo", "Texto corrido", "17–19 px"],
  ["--passo-ui", "Botões e navegação", "16 px"],
  ["--passo-pequeno", "Notas, metadados", "13–14 px"],
] as const;

function Bloco({ titulo, chao = "papel", children }: { titulo: string; chao?: "papel" | "preto"; children: ReactNode }) {
  return (
    <section className="inventario__bloco" data-chao={chao} aria-labelledby={`inv-${titulo}`}>
      <h2 id={`inv-${titulo}`} className="inventario__titulo">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

async function Conteudo() {
  await exigirAdmin("/admin/design");
  const [cursos, planos] = await Promise.all([listarCursos(), listarPlanos()]);
  const exemplo = cursos[2] ?? cursos[0];

  return (
    <div className="inventario">
      <Bloco titulo="Cores">
        <ul className="inventario__cores">
          {CORES.map(([token, hex, uso]) => (
            <li key={token}>
              <span className="inventario__amostra" style={{ background: `var(${token})` }} />
              <code>{token}</code>
              <span>{hex}</span>
              <span className="inventario__uso">{uso}</span>
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="Tipografia">
        <ul className="inventario__tipos">
          {TIPOS.map(([token, uso, faixa]) => (
            <li key={token}>
              <span style={{ fontSize: `var(${token})`, fontWeight: token === "--passo-titulo" ? 600 : 500 }}>{uso}</span>
              <code>
                {token} · {faixa}
              </code>
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="Botões no claro">
        <div className="inventario__linha">
          <Botao>Principal</Botao>
          <Botao variante="secundario">Secundário</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="perigo">Excluir</Botao>
          <Botao pequeno>Pequeno</Botao>
          <Botao disabled>Desabilitado</Botao>
          <BotaoLink href="/">Link com cara de botão</BotaoLink>
        </div>
      </Bloco>

      <Bloco titulo="Botões no escuro" chao="preto">
        <div className="inventario__linha">
          <Botao>Principal</Botao>
          <Botao variante="secundario">Secundário</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao carregando textoCarregando="Carregando…">
            Carregando
          </Botao>
        </div>
      </Bloco>

      <Bloco titulo="Campos de formulário">
        <DemoCampos />
      </Bloco>

      <Bloco titulo="Selos, notas e progresso">
        <div className="inventario__linha">
          <Selo>Neutro</Selo>
          <Selo tom="ouro">Rascunho</Selo>
          <Selo tom="salvia">Publicado</Selo>
          <Selo tom="erro">Bloqueado</Selo>
          <Estrelas nota={4.6} total={128} />
          <Estrelas nota={3} />
        </div>
        <div className="inventario__progresso">
          <BarraProgresso valor={0} rotulo="Progresso do curso" />
          <BarraProgresso valor={40} rotulo="Progresso do curso" />
          <BarraProgresso valor={100} rotulo="Progresso do curso" />
        </div>
      </Bloco>

      <Bloco titulo="Avisos">
        <div className="inventario__pilha">
          <Aviso tipo="info" titulo="Informação">
            Aparece com calma para leitores de tela (role=status).
          </Aviso>
          <Aviso tipo="sucesso" titulo="Senha alterada." />
          <Aviso tipo="erro" titulo="E-mail ou senha incorretos.">
            Anunciado na hora (role=alert) e recebe o foco após o envio.
          </Aviso>
        </div>
      </Bloco>

      <Bloco titulo="Card do curso" chao="preto">
        <div className="inventario__card">
          {exemplo && <CardCurso curso={exemplo} plano={planoMinimo(planos, exemplo.id)} />}
          <div className="card-curso card-curso--esqueleto" aria-hidden="true">
            <Esqueleto proporcao="16 / 9" />
            <div className="card-curso__corpo">
              <Esqueleto largura="40%" altura="0.9rem" />
              <Esqueleto largura="85%" altura="1.4rem" />
              <Esqueleto largura="60%" altura="0.9rem" />
            </div>
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Acordeão, tabela e estado vazio">
        <div className="inventario__pilha">
          <div className="acordeoes">
            <Acordeao titulo="Módulo 1 · Primeiro contato" detalhe="3 aulas" aberto>
              <p>Conteúdo do módulo. Abre e fecha com Enter ou Espaço.</p>
            </Acordeao>
            <Acordeao titulo="Módulo 2 · Mão na massa" detalhe="5 aulas">
              <p>Fechado por padrão.</p>
            </Acordeao>
          </div>
          <div className="tabela-moldura">
            <table className="tabela">
              <caption className="sr-only">Exemplo de tabela</caption>
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Plano</th>
                  <th scope="col" className="tabela__numero">
                    Progresso
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Maria (exemplo)</td>
                  <td>Completo</td>
                  <td className="tabela__numero">72%</td>
                </tr>
                <tr>
                  <td>João (exemplo)</td>
                  <td>Essencial</td>
                  <td className="tabela__numero">15%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <EstadoVazio titulo="Você ainda não começou nenhum curso." acao={<BotaoLink href="/">Ver os cursos</BotaoLink>}>
            Escolha um curso e ele aparece aqui, com o seu progresso.
          </EstadoVazio>
        </div>
      </Bloco>

      <Bloco titulo="Abas, modal, gaveta, aviso flutuante e mais campos">
        <DemoInterativos />
      </Bloco>

      <Bloco titulo="Paginação e chips de filtro">
        <div className="inventario__pilha">
          <Paginacao pagina={3} total={240} tamanho={25} href={(p) => `/admin/design?pagina=${p}`} rotulo="Exemplo de paginação" />
          <div className="chips">
            <a className="chip" href="#chips">
              Vídeo <span aria-hidden="true">×</span>
            </a>
            <a className="chip" href="#chips">
              Iniciante <span aria-hidden="true">×</span>
            </a>
          </div>
        </div>
      </Bloco>
    </div>
  );
}

export default function InventarioDesign() {
  return (
    <section className="painel-pagina" aria-labelledby="inventario-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin · Design</p>
        <h1 id="inventario-titulo" className="painel-topo__titulo">
          Inventário de componentes
        </h1>
        <p className="painel-topo__apoio">As peças de interface da plataforma, com a paleta e a tipografia da marca.</p>
      </header>
      <Suspense fallback={<Esqueleto altura="24rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}

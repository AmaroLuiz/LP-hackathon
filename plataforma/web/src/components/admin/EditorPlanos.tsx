"use client";

import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso } from "@/components/ui/Exibicao";
import { Alternador, AreaTexto } from "@/components/ui/Formulario";
import type { FundadorAdmin, PlanoAdmin } from "@/lib/assinatura";
import { enviar } from "@/lib/cliente";
import { centavosDe, plural, preco } from "@/lib/formato";
import { EditorLista } from "./editor/EditorLista";

type Curso = { id: number; numero: number; titulo: string; status: string };

function reaisDe(centavos: number) {
  return (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

/** Os planos: preço, itens, cursos liberados e se está à venda. Cada um salva separado. */
export function EditorPlanos({ iniciais, cursos }: { iniciais: PlanoAdmin[]; cursos: Curso[] }) {
  const [planos, setPlanos] = useState(iniciais);
  return (
    <div className="planos-admin">
      {planos.map((p) => (
        <FormPlano key={p.id} plano={p} cursos={cursos} aoSalvar={setPlanos} />
      ))}
    </div>
  );
}

function FormPlano({ plano, cursos, aoSalvar }: { plano: PlanoAdmin; cursos: Curso[]; aoSalvar: (p: PlanoAdmin[]) => void }) {
  const [nome, setNome] = useState(plano.nome);
  const [valor, setValor] = useState(reaisDe(plano.precoCentavos));
  const [maxPessoas, setMaxPessoas] = useState(String(plano.maxPessoas));
  const [itens, setItens] = useState(plano.itens);
  const [ativo, setAtivo] = useState(plano.ativo);
  const [selecionados, setSelecionados] = useState(new Set(plano.cursos));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const precoCentavos = centavosDe(valor);
    if (precoCentavos === null) {
      setErros({ precoCentavos: "Use só números, como 89 ou 89,90." });
      return;
    }
    if (precoCentavos !== plano.precoCentavos && plano.assinantes > 0) {
      const ok = await confirmar({
        titulo: `Mudar o preço do ${plano.nome} para ${preco(precoCentavos)}?`,
        texto: `Quem assina hoje (${plural(plano.assinantes, "pessoa", "pessoas")}) passa a pagar o preço novo a partir da próxima cobrança. Fundadores com o preço travado só mudam quando a trava acabar. Avise os assinantes antes.`,
        confirmar: "Mudar o preço",
        perigo: precoCentavos > plano.precoCentavos,
      });
      if (!ok) return;
    }
    setSalvando(true);
    const r = await enviar<PlanoAdmin[]>(
      `/api/admin/planos/${plano.id}`,
      { nome, precoCentavos, maxPessoas: Number(maxPessoas), itens, ativo, cursos: [...selecionados] },
      "PUT",
    );
    setSalvando(false);
    if (!r.ok) {
      setErros(Object.keys(r.campos).length ? r.campos : { geral: r.mensagem });
      return;
    }
    setErros({});
    aoSalvar(r.dados);
    avisar(`Plano ${nome} salvo.`);
  }

  return (
    <form className="painel-bloco plano-admin" onSubmit={salvar} noValidate aria-labelledby={`plano-${plano.id}`}>
      {dialogo}
      <div className="plano-admin__cabeca">
        <h2 id={`plano-${plano.id}`} className="painel-bloco__titulo">
          {plano.nome}
        </h2>
        <span className="campo__ajuda">{plural(plano.assinantes, "assinante", "assinantes")}</span>
      </div>
      {erros.geral && <Aviso tipo="erro" titulo={erros.geral} />}
      <div className="editor-colunas">
        <Campo id={`${plano.id}-nome`} rotulo="Nome" maxLength={60} value={nome} erro={erros.nome} onChange={(e) => setNome(e.target.value)} />
        <Campo
          id={`${plano.id}-preco`}
          rotulo="Preço por mês (R$)"
          inputMode="decimal"
          value={valor}
          erro={erros.precoCentavos}
          onChange={(e) => {
            setValor(e.target.value);
            setErros({});
          }}
        />
        <Campo
          id={`${plano.id}-pessoas`}
          rotulo="Pessoas na assinatura"
          inputMode="numeric"
          value={maxPessoas}
          erro={erros.maxPessoas}
          ajuda="Mais de 1: o titular convida a equipe."
          onChange={(e) => setMaxPessoas(e.target.value.replace(/\D/g, "").slice(0, 2))}
        />
      </div>
      <EditorLista id={`${plano.id}-itens`} rotulo="O que o plano inclui" marcador="Item" itens={itens} erro={erros.itens} aoMudar={setItens} />
      <fieldset className="grupo-campos">
        <legend className="campo__rotulo">Cursos liberados ({selecionados.size})</legend>
        <div className="opcoes-lista opcoes-lista--colunas">
          {cursos.map((c) => (
            <label key={c.id} className="filtros__opcao">
              <input
                type="checkbox"
                checked={selecionados.has(c.id)}
                onChange={(e) => {
                  const novo = new Set(selecionados);
                  if (e.target.checked) novo.add(c.id);
                  else novo.delete(c.id);
                  setSelecionados(novo);
                }}
              />
              {c.numero} · {c.titulo}
              {c.status !== "PUBLICADO" && <span className="campo__ajuda"> ({c.status === "RASCUNHO" ? "rascunho" : "arquivado"})</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <Alternador id={`${plano.id}-ativo`} rotulo="À venda" ligado={ativo} aoMudar={setAtivo} ajuda="Desligado: some da página de planos. Quem já assina continua." />
      <div className="acoes acoes--compactas">
        <Botao type="submit" pequeno carregando={salvando} textoCarregando="Salvando…">
          Salvar {plano.nome}
        </Botao>
      </div>
    </form>
  );
}

/** Regras da condição de fundador (valem para quem assinar daqui em diante). */
export function EditorFundador({ inicial }: { inicial: FundadorAdmin }) {
  const [f, setF] = useState(inicial);
  const [ativa, setAtiva] = useState(inicial.ativa);
  const [desconto, setDesconto] = useState(String(inicial.descontoPercentual));
  const [meses, setMeses] = useState(String(inicial.mesesDesconto));
  const [trava, setTrava] = useState(String(inicial.mesesPrecoTravado));
  const [ate, setAte] = useState(inicial.validaAte ? inicial.validaAte.slice(0, 10) : "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAvisos();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar<FundadorAdmin>(
      "/api/admin/fundador",
      {
        ativa,
        descontoPercentual: Number(desconto),
        mesesDesconto: Number(meses),
        mesesPrecoTravado: Number(trava),
        validaAte: ate ? new Date(`${ate}T23:59:59-03:00`).toISOString() : null,
      },
      "PUT",
    );
    setSalvando(false);
    if (!r.ok) return setErros(Object.keys(r.campos).length ? r.campos : { geral: r.mensagem });
    setErros({});
    setF(r.dados);
    avisar("Condição de fundador salva.");
  }

  const numero = (v: string) => v.replace(/\D/g, "").slice(0, 2);
  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      {erros.geral && <Aviso tipo="erro" titulo={erros.geral} />}
      <Alternador id="fundador-ativa" rotulo="Condição de fundador valendo" ligado={ativa} aoMudar={setAtiva} ajuda="Desligada: ninguém novo ganha a condição; quem já tem, mantém." />
      <div className="editor-colunas">
        <Campo id="fundador-desconto" rotulo="Desconto (%)" inputMode="numeric" value={desconto} erro={erros.descontoPercentual} onChange={(e) => setDesconto(numero(e.target.value))} />
        <Campo id="fundador-meses" rotulo="Cobranças com desconto" inputMode="numeric" value={meses} erro={erros.mesesDesconto} onChange={(e) => setMeses(numero(e.target.value))} />
        <Campo id="fundador-trava" rotulo="Meses com o preço travado" inputMode="numeric" value={trava} erro={erros.mesesPrecoTravado} onChange={(e) => setTrava(numero(e.target.value))} />
        <Campo id="fundador-ate" rotulo="Vale para quem assinar até (opcional)" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
      </div>
      <p className="campo__ajuda">
        {plural(f.emails, "e-mail na lista de espera", "e-mails na lista de espera")} · {plural(f.assinantesFundadores, "fundador assinando", "fundadores assinando")}
      </p>
      <div className="acoes acoes--compactas">
        <Botao type="submit" pequeno carregando={salvando} textoCarregando="Salvando…">
          Salvar condição
        </Botao>
      </div>
    </form>
  );
}

/** A lista de espera da landing: cola os e-mails (uma coluna da planilha serve). */
export function ListaDeEspera({ total }: { total: number }) {
  const [texto, setTexto] = useState("");
  const [carregada, setCarregada] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  async function carregar() {
    const r = await fetch("/api/admin/fundador/lista", { credentials: "same-origin" });
    if (r.ok) {
      setTexto(((await r.json()) as string[]).join("\n"));
      setCarregada(true);
    }
  }

  async function salvar() {
    const ok = await confirmar({
      titulo: "Trocar a lista de espera?",
      texto: "A lista inteira passa a ser o que está no campo. Quem já assinou como fundador mantém a condição.",
      confirmar: "Trocar a lista",
    });
    if (!ok) return;
    setSalvando(true);
    const r = await enviar<{ validos: number; invalidos: number; exemplosInvalidos: string[] }>("/api/admin/fundador/lista", { texto }, "PUT");
    setSalvando(false);
    if (!r.ok) return avisar(r.mensagem, "erro");
    setResultado(
      `${plural(r.dados.validos, "e-mail salvo", "e-mails salvos")}.` +
        (r.dados.invalidos > 0 ? ` ${plural(r.dados.invalidos, "linha ignorada", "linhas ignoradas")} (ex.: ${r.dados.exemplosInvalidos.join(", ")}).` : ""),
    );
    avisar("Lista de espera atualizada.");
  }

  return (
    <div className="formulario">
      {dialogo}
      {!carregada && total > 0 ? (
        <Botao pequeno variante="secundario" onClick={carregar}>
          Ver e editar os {total} e-mails
        </Botao>
      ) : (
        <>
          <AreaTexto
            id="lista-espera"
            rotulo="E-mails da lista de espera"
            rows={8}
            value={texto}
            ajuda="Um por linha, ou separados por vírgula. Cole direto da planilha da landing."
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="acoes acoes--compactas">
            <Botao pequeno carregando={salvando} textoCarregando="Salvando…" onClick={salvar}>
              Salvar lista
            </Botao>
          </div>
        </>
      )}
      {resultado && <Aviso tipo="sucesso" titulo={resultado} />}
    </div>
  );
}

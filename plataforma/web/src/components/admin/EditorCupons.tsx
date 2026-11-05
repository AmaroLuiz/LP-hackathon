"use client";

import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso, EstadoVazio, Selo } from "@/components/ui/Exibicao";
import { Selecao } from "@/components/ui/Formulario";
import { enviar } from "@/lib/cliente";

export type CupomAdmin = {
  id: string;
  codigo: string;
  descricao: string | null;
  percentual: number;
  meses: number;
  planoId: string | null;
  validoAte: string | null;
  limiteUsos: number | null;
  usos: number;
  ativo: boolean;
  criadoEm: string;
};

const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

const VAZIO = { codigo: "", descricao: "", percentual: "", meses: "1", planoId: "", validoAte: "", limiteUsos: "" };

/**
 * Cupons de desconto: criar, ativar e desativar. O desconto vale nas primeiras
 * cobranças e não soma com a condição de fundador (vale o maior).
 */
export function EditorCupons({ iniciais, planos }: { iniciais: CupomAdmin[]; planos: { id: string; nome: string }[] }) {
  const { avisar } = useAvisos();
  const [cupons, setCupons] = useState(iniciais);
  const [novo, setNovo] = useState(VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const agora = new Date().toISOString();

  const numero = (v: string, max = 3) => v.replace(/\D/g, "").slice(0, max);
  const campo = (nome: keyof typeof VAZIO) => ({
    value: novo[nome],
    erro: erros[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = nome === "codigo" ? e.target.value.toUpperCase() : ["percentual", "meses", "limiteUsos"].includes(nome) ? numero(e.target.value) : e.target.value;
      setNovo((n) => ({ ...n, [nome]: v }));
    },
  });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar<CupomAdmin>("/api/admin/cupons", {
      codigo: novo.codigo,
      descricao: novo.descricao,
      percentual: novo.percentual ? Number(novo.percentual) : null,
      meses: novo.meses ? Number(novo.meses) : null,
      planoId: novo.planoId || null,
      validoAte: novo.validoAte ? new Date(`${novo.validoAte}T23:59:59-03:00`).toISOString() : null,
      limiteUsos: novo.limiteUsos ? Number(novo.limiteUsos) : null,
    });
    setSalvando(false);
    if (!r.ok) return setErros(Object.keys(r.campos).length ? r.campos : { geral: r.mensagem });
    setErros({});
    setCupons((c) => [r.dados, ...c]);
    setNovo(VAZIO);
    avisar(`Cupom ${r.dados.codigo} criado.`);
  }

  async function alternar(c: CupomAdmin) {
    const r = await enviar<CupomAdmin>(`/api/admin/cupons/${c.id}`, { ativo: !c.ativo }, "PUT");
    if (!r.ok) return avisar(r.mensagem, "erro");
    setCupons((lista) => lista.map((x) => (x.id === c.id ? r.dados : x)));
    avisar(r.dados.ativo ? `Cupom ${c.codigo} ativado.` : `Cupom ${c.codigo} desativado.`);
  }

  function situacao(c: CupomAdmin) {
    if (!c.ativo) return <Selo>Desativado</Selo>;
    if (c.validoAte && c.validoAte < agora) return <Selo tom="erro">Vencido</Selo>;
    if (c.limiteUsos !== null && c.usos >= c.limiteUsos) return <Selo tom="erro">Esgotado</Selo>;
    return <Selo tom="salvia">Valendo</Selo>;
  }

  return (
    <div className="cupons-admin">
      <form className="formulario" onSubmit={criar} noValidate aria-label="Novo cupom">
        {erros.geral && <Aviso tipo="erro" titulo={erros.geral} />}
        <div className="editor-colunas">
          <Campo id="cupom-codigo" rotulo="Código" ajuda="Letras, números, hífen. Ex.: LIVE-MAIO" maxLength={40} autoComplete="off" spellCheck={false} required {...campo("codigo")} />
          <Campo id="cupom-percentual" rotulo="Desconto (%)" inputMode="numeric" required {...campo("percentual")} />
          <Campo id="cupom-meses" rotulo="Cobranças com desconto" inputMode="numeric" {...campo("meses")} />
          <Selecao id="cupom-plano" rotulo="Vale para" value={novo.planoId} onChange={(e) => setNovo((n) => ({ ...n, planoId: e.target.value }))} erro={erros.planoId}>
            <option value="">Qualquer plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Selecao>
          <Campo id="cupom-ate" rotulo="Válido até (opcional)" type="date" {...campo("validoAte")} />
          <Campo id="cupom-limite" rotulo="Limite de usos (opcional)" inputMode="numeric" {...campo("limiteUsos")} />
        </div>
        <Campo id="cupom-descricao" rotulo="Descrição interna (opcional)" maxLength={200} ajuda="Para lembrar de onde veio: parceria, live, campanha." {...campo("descricao")} />
        <div className="acoes acoes--compactas">
          <Botao type="submit" pequeno carregando={salvando} textoCarregando="Criando…">
            Criar cupom
          </Botao>
        </div>
      </form>

      {cupons.length === 0 ? (
        <EstadoVazio titulo="Nenhum cupom criado." />
      ) : (
        <div className="tabela-moldura">
          <table className="tabela tabela--densa">
            <caption className="sr-only">Cupons de desconto</caption>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Desconto</th>
                <th scope="col">Plano</th>
                <th scope="col">Validade</th>
                <th scope="col">Usos</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.codigo}</strong>
                    {c.descricao && <span className="tabela__detalhe">{c.descricao}</span>}
                  </td>
                  <td>
                    {c.percentual}% · {c.meses} {c.meses === 1 ? "cobrança" : "cobranças"}
                  </td>
                  <td>{planos.find((p) => p.id === c.planoId)?.nome ?? "Qualquer"}</td>
                  <td>{c.validoAte ? dia.format(new Date(c.validoAte)) : "Sem prazo"}</td>
                  <td>
                    {c.usos}
                    {c.limiteUsos !== null && ` de ${c.limiteUsos}`}
                  </td>
                  <td>{situacao(c)}</td>
                  <td>
                    <Botao variante="fantasma" pequeno onClick={() => alternar(c)}>
                      {c.ativo ? "Desativar" : "Ativar"}
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

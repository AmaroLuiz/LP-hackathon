"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { plural } from "@/lib/formato";

type Valido = { codigo: string; percentual: number; meses: number; descricao: string | null };

/**
 * "Tem um cupom?": confere o código em cada plano e guarda na URL (?cupom=),
 * de onde os botões de assinar leem. Não soma com a condição de fundador:
 * na contratação vale o maior desconto.
 */
export function CampoCupom({ planos }: { planos: { id: string; nome: string }[] }) {
  const parametros = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const aplicado = parametros.get("cupom");
  const [codigo, setCodigo] = useState(aplicado ?? "");
  const [aberto, setAberto] = useState(Boolean(aplicado));
  const [conferindo, setConferindo] = useState(false);
  const [resultado, setResultado] = useState<{ valido: Valido; planos: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function trocarUrl(cupom: string | null) {
    const p = new URLSearchParams(parametros.toString());
    if (cupom) p.set("cupom", cupom);
    else p.delete("cupom");
    const consulta = p.toString();
    router.replace(consulta ? `${caminho}?${consulta}` : caminho, { scroll: false });
  }

  async function aplicar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = codigo.trim();
    if (!limpo) return;
    setConferindo(true);
    setErro(null);
    setResultado(null);
    const respostas = await Promise.all(
      planos.map(async (p) => {
        try {
          const r = await fetch(`/api/cupons/${encodeURIComponent(limpo)}?plano=${encodeURIComponent(p.id)}`);
          const corpo = await r.json().catch(() => null);
          return r.ok ? { plano: p.nome, valido: corpo as Valido } : { plano: p.nome, erro: (corpo?.detail as string) ?? "Cupom não encontrado." };
        } catch {
          return { plano: p.nome, erro: "Sem conexão. Tente de novo." };
        }
      }),
    );
    setConferindo(false);
    const validos = respostas.filter((r) => "valido" in r);
    if (validos.length === 0) {
      setErro(respostas[0]?.erro ?? "Cupom não encontrado.");
      trocarUrl(null);
      return;
    }
    setResultado({ valido: validos[0].valido!, planos: validos.map((v) => v.plano) });
    trocarUrl(validos[0].valido!.codigo);
  }

  function remover() {
    setCodigo("");
    setResultado(null);
    setErro(null);
    trocarUrl(null);
  }

  if (!aberto) {
    return (
      <p className="cupom">
        <button type="button" className="link link--sublinhado" onClick={() => setAberto(true)}>
          Tem um cupom de desconto?
        </button>
      </p>
    );
  }

  return (
    <form className="cupom cupom--aberto" onSubmit={aplicar} noValidate>
      <label htmlFor="cupom" className="campo__rotulo">
        Cupom de desconto
      </label>
      <div className="cupom__linha">
        <input
          id="cupom"
          className="campo__entrada cupom__entrada"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={erro ? true : undefined}
          aria-describedby="cupom-situacao"
        />
        <Botao type="submit" variante="secundario" pequeno carregando={conferindo} textoCarregando="Conferindo…">
          Aplicar
        </Botao>
        {(resultado || aplicado) && (
          <button type="button" className="anotacao__acao" onClick={remover}>
            Remover
          </button>
        )}
      </div>
      <p id="cupom-situacao" className={erro ? "campo__erro" : "campo__ajuda"} role="status">
        {erro ??
          (resultado
            ? `${resultado.valido.codigo}: ${resultado.valido.percentual}% de desconto ${
                resultado.valido.meses === 1 ? "na primeira mensalidade" : `nas ${plural(resultado.valido.meses, "primeira mensalidade", "primeiras mensalidades")}`
              }${resultado.planos.length < planos.length ? `, no ${resultado.planos.join(" e no ")}` : ""}. Se você tiver a condição de fundador, vale o maior desconto.`
            : aplicado
              ? `Cupom ${aplicado} será usado ao assinar.`
              : "O desconto aparece na página de pagamento.")}
      </p>
    </form>
  );
}

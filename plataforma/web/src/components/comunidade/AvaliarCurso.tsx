"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso, BarraProgresso } from "@/components/ui/Exibicao";
import { AreaTexto } from "@/components/ui/Formulario";
import { enviar } from "@/lib/cliente";
import { NOTAS, ROTULO_NOTA, type MinhaAvaliacao } from "@/lib/comunidade";

/**
 * Aba "Avaliações do curso" do player: quem já fez pelo menos 30% do curso dá
 * a nota (1 a 5) e um comentário opcional; dá para editar ou apagar depois.
 */
export function AvaliarCurso({ slug, percentual }: { slug: string; percentual: number }) {
  const [minha, setMinha] = useState<MinhaAvaliacao | null>(null);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { confirmar, dialogo } = useConfirmacao();

  // O percentual muda quando a pessoa conclui aulas no player: busca de novo.
  useEffect(() => {
    let ativo = true;
    fetch(`/api/cursos/${slug}/minha-avaliacao`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<MinhaAvaliacao>) : null))
      .then((dados) => {
        if (!ativo || !dados) return;
        setMinha(dados);
        setNota((atual) => atual ?? dados.nota);
        setComentario((atual) => atual || (dados.comentario ?? ""));
      })
      .catch(() => ativo && setErro("Não conseguimos carregar a sua avaliação."));
    return () => {
      ativo = false;
    };
  }, [slug, percentual]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota) {
      setErro("Escolha de 1 a 5 estrelas.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setAviso(null);
    const r = await enviar<MinhaAvaliacao>(`/api/cursos/${slug}/avaliacao`, { nota, comentario }, "PUT");
    setSalvando(false);
    if (!r.ok) {
      setErro(r.campos.comentario ?? r.campos.nota ?? r.mensagem);
      return;
    }
    const nova = minha?.nota == null;
    setMinha(r.dados);
    setAviso(nova ? "Obrigado! Sua avaliação já aparece na página do curso." : "Avaliação atualizada.");
  }

  async function apagar() {
    if (!(await confirmar({ titulo: "Apagar avaliação", texto: "Sua nota sai da média do curso.", confirmar: "Apagar", perigo: true }))) return;
    const r = await enviar(`/api/cursos/${slug}/avaliacao`, null, "DELETE");
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    setMinha((m) => (m ? { ...m, nota: null, comentario: null, respostaEquipe: null } : m));
    setNota(null);
    setComentario("");
    setAviso("Avaliação apagada.");
  }

  if (!minha) {
    return erro ? <Aviso tipo="erro" titulo={erro} /> : <p className="duvidas__carregando">Carregando…</p>;
  }

  if (!minha.podeAvaliar) {
    return (
      <div className="avaliar avaliar--cedo">
        <h2 className="duvidas__titulo">Avalie quando tiver avançado no curso</h2>
        <p>
          A avaliação abre depois de {minha.minimo}% do curso concluído, para que as notas venham de quem realmente
          estudou. Faltam {Math.max(0, minha.minimo - minha.percentual)} pontos percentuais.
        </p>
        <BarraProgresso valor={minha.percentual} rotulo="Progresso no curso" />
      </div>
    );
  }

  return (
    <form className="avaliar" onSubmit={salvar} noValidate>
      <h2 className="duvidas__titulo">{minha.nota ? "Sua avaliação" : "O que você está achando do curso?"}</h2>
      <EntradaNota valor={nota} aoMudar={setNota} />
      <AreaTexto
        id={`comentario-${slug}`}
        rotulo="Comentário (opcional)"
        rows={4}
        maxLength={2000}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        ajuda="Conte o que você aplicou no seu negócio. O comentário aparece com o seu primeiro nome e a inicial do sobrenome."
      />
      {erro && <Aviso tipo="erro" titulo={erro} />}
      {aviso && <Aviso tipo="sucesso" titulo={aviso} />}
      {minha.respostaEquipe && (
        <div className="resposta resposta--equipe">
          <p className="resposta__autor">
            Resposta da Equipe PotencIA<span className="resposta__expoente" aria-hidden="true" />
          </p>
          <p className="resposta__texto">{minha.respostaEquipe}</p>
        </div>
      )}
      <div className="anotacoes__acoes">
        <Botao type="submit" pequeno carregando={salvando} textoCarregando="Salvando…">
          {minha.nota ? "Atualizar avaliação" : "Enviar avaliação"}
        </Botao>
        {minha.nota && (
          <button type="button" className="anotacao__acao anotacao__acao--perigo" onClick={apagar}>
            Apagar avaliação
          </button>
        )}
      </div>
      {dialogo}
    </form>
  );
}

/** Estrelas clicáveis: por dentro, um grupo de rádios (setas do teclado trocam a nota). */
export function EntradaNota({ valor, aoMudar }: { valor: number | null; aoMudar: (nota: number) => void }) {
  const [sobre, setSobre] = useState<number | null>(null);
  const mostrada = sobre ?? valor ?? 0;
  return (
    <fieldset className="entrada-nota" onMouseLeave={() => setSobre(null)}>
      <legend className="campo__rotulo">Sua nota</legend>
      <div className="entrada-nota__estrelas">
        {[...NOTAS].reverse().map((n) => (
          <label key={n} className={`entrada-nota__estrela${n <= mostrada ? " is-cheia" : ""}`} onMouseEnter={() => setSobre(n)}>
            <input type="radio" name="nota" value={n} checked={valor === n} onChange={() => aoMudar(n)} className="sr-only" />
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6l-6 3.3 1.3-6.7-5-4.7 6.8-.8z" />
            </svg>
            <span className="sr-only">
              {n} {n === 1 ? "estrela" : "estrelas"}: {ROTULO_NOTA[n]}
            </span>
          </label>
        ))}
        <span className="entrada-nota__rotulo" aria-hidden="true">
          {mostrada ? ROTULO_NOTA[mostrada] : "Escolha de 1 a 5"}
        </span>
      </div>
    </fieldset>
  );
}

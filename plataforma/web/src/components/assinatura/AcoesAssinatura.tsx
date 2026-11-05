"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso } from "@/components/ui/Exibicao";
import { AreaTexto } from "@/components/ui/Formulario";
import { Modal } from "@/components/ui/Modal";
import { MOTIVOS_CANCELAMENTO, type Equipe, type MinhaAssinatura, type PlanoResumo } from "@/lib/assinatura";
import { enviar } from "@/lib/cliente";
import { dataPorExtenso, preco } from "@/lib/formato";

/** Escolher outro plano: mais caro vale na hora; mais barato, na próxima cobrança. */
export function TrocarPlano({ assinatura, planos }: { assinatura: MinhaAssinatura; planos: PlanoResumo[] }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const router = useRouter();
  const atual = assinatura.plano;

  async function trocar(p: PlanoResumo) {
    setEnviando(p.id);
    setMensagem(null);
    const r = await enviar<MinhaAssinatura>("/api/me/assinatura/trocar-plano", { planoId: p.id });
    setEnviando(null);
    if (!r.ok) {
      setMensagem({ tipo: "erro", texto: r.campos.planoId ?? r.mensagem });
      return;
    }
    const texto =
      p.id === atual.id
        ? "Troca cancelada. Você continua no plano atual."
        : r.dados.planoAgendado
          ? `Pronto. O plano ${p.nome} começa na próxima cobrança, em ${dataPorExtenso(r.dados.fimPeriodoAtual)}.`
          : `Pronto. Você já está no plano ${p.nome}: os cursos novos estão liberados.`;
    setMensagem({ tipo: "sucesso", texto });
    router.refresh();
  }

  return (
    <div className="troca-plano">
      {mensagem && <Aviso tipo={mensagem.tipo} titulo={mensagem.texto} />}
      <ul className="troca-plano__lista">
        {planos.map((p) => {
          const eAtual = p.id === atual.id;
          const agendado = assinatura.planoAgendado?.id === p.id;
          const sobe = p.precoCentavos > assinatura.plano.precoCentavos;
          return (
            <li key={p.id} className={`troca-plano__item${eAtual ? " is-atual" : ""}`}>
              <div>
                <p className="troca-plano__nome">{p.nome}</p>
                <p className="troca-plano__preco">
                  {preco(p.precoCentavos)}
                  <small>/mês</small> · {p.maxPessoas === 1 ? "1 pessoa" : `até ${p.maxPessoas} pessoas`}
                </p>
              </div>
              {eAtual ? (
                assinatura.planoAgendado ? (
                  <Botao pequeno variante="secundario" carregando={enviando === p.id} textoCarregando="Salvando…" onClick={() => trocar(p)}>
                    Continuar neste plano
                  </Botao>
                ) : (
                  <span className="selo selo--salvia">Seu plano</span>
                )
              ) : agendado ? (
                <span className="selo selo--ouro">Começa na próxima cobrança</span>
              ) : (
                <div className="troca-plano__acao">
                  <Botao pequeno variante={sobe ? "principal" : "secundario"} carregando={enviando === p.id} textoCarregando="Trocando…" disabled={enviando !== null} onClick={() => trocar(p)}>
                    {sobe ? `Mudar para o ${p.nome}` : `Descer para o ${p.nome}`}
                  </Botao>
                  <span className="campo__ajuda">{sobe ? "Vale na hora; a próxima cobrança já vem no valor novo." : "Vale na próxima cobrança."}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Cancelar sem dificultar: um motivo opcional e pronto. O acesso continua até o fim do período pago. */
export function CancelarAssinatura({ assinatura }: { assinatura: MinhaAssinatura }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function cancelar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const r = await enviar("/api/me/assinatura/cancelar", { motivo, comentario });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <Botao variante="secundario" pequeno onClick={() => setAberto(true)}>
        Cancelar assinatura
      </Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Cancelar a assinatura" chao="papel">
        <form className="formulario" onSubmit={cancelar}>
          <p className="confirmacao__texto">
            Nada mais será cobrado. Você continua com acesso aos cursos até <strong>{dataPorExtenso(assinatura.fimPeriodoAtual)}</strong> e pode
            reativar até lá.
          </p>
          <fieldset className="grupo-radio">
            <legend className="campo__rotulo">Quer contar o motivo? (opcional)</legend>
            <div className="opcoes-lista">
              {MOTIVOS_CANCELAMENTO.map((m) => (
                <label key={m} className="filtros__opcao">
                  <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
          <AreaTexto id="cancelar-comentario" rotulo="Algo mais? (opcional)" rows={3} maxLength={230} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          {erro && <Aviso tipo="erro" titulo={erro} />}
          <div className="confirmacao__acoes">
            <Botao variante="secundario" autoFocus onClick={() => setAberto(false)}>
              Manter assinatura
            </Botao>
            <Botao type="submit" variante="perigo" carregando={enviando} textoCarregando="Cancelando…">
              Cancelar assinatura
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ReativarAssinatura() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="reativar">
      <Botao
        carregando={enviando}
        textoCarregando="Reativando…"
        onClick={async () => {
          setEnviando(true);
          const r = await enviar("/api/me/assinatura/reativar", {});
          setEnviando(false);
          if (!r.ok) return setErro(r.mensagem);
          router.refresh();
        }}
      >
        Reativar assinatura
      </Botao>
      {erro && <Aviso tipo="erro" titulo={erro} />}
    </div>
  );
}

/** Equipe do plano Negócio: convidar por e-mail, ver convites em aberto e remover. */
export function GerenciarEquipe({ inicial }: { inicial: Equipe }) {
  const [equipe, setEquipe] = useState(inicial);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { confirmar, dialogo } = useConfirmacao();

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(undefined);
    setAviso(null);
    const r = await enviar<Equipe>("/api/me/equipe/convites", { email });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.campos.email ?? r.mensagem);
      return;
    }
    setEquipe(r.dados);
    setAviso(`Convite enviado para ${email}. O link vale por 7 dias.`);
    setEmail("");
  }

  async function remover(id: string, quem: string) {
    const ok = await confirmar({ titulo: `Tirar ${quem} da equipe?`, texto: "A pessoa perde o acesso aos cursos do plano na hora.", confirmar: "Tirar da equipe", perigo: true });
    if (!ok) return;
    const r = await enviar<Equipe>(`/api/me/equipe/membros/${id}`, null, "DELETE");
    if (!r.ok) return setErro(r.mensagem);
    setEquipe(r.dados);
    setAviso(`${quem} saiu da equipe.`);
  }

  return (
    <div className="equipe">
      {dialogo}
      <p className="equipe__vagas">
        {equipe.vagas === 0 ? "Sem vagas livres." : `${equipe.vagas} ${equipe.vagas === 1 ? "vaga livre" : "vagas livres"}`} · até {equipe.maxPessoas}{" "}
        pessoas com você
      </p>
      {equipe.membros.length > 0 && (
        <ul className="equipe__lista">
          {equipe.membros.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.nome ?? m.email}</strong>
                {m.nome && <span className="campo__ajuda"> · {m.email}</span>}
                <span className="campo__ajuda">
                  {" "}
                  · {m.status === "ATIVO" ? "Na equipe" : `Convite enviado (vale até ${dataPorExtenso(m.conviteExpiraEm ?? m.convidadoEm)})`}
                </span>
              </span>
              <button type="button" className="link link--sublinhado link--perigo" onClick={() => remover(m.id, m.nome ?? m.email)}>
                {m.status === "ATIVO" ? "Tirar da equipe" : "Cancelar convite"}
                <span className="sr-only"> de {m.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aviso && <Aviso tipo="sucesso" titulo={aviso} />}
      {equipe.vagas > 0 && (
        <form className="equipe__convite" onSubmit={convidar} noValidate>
          <Campo
            id="convite-email"
            rotulo="Convidar pelo e-mail"
            type="email"
            autoComplete="off"
            value={email}
            erro={erro}
            ajuda="A pessoa recebe um link para entrar ou criar a conta com esse e-mail."
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(undefined);
            }}
          />
          <Botao type="submit" pequeno carregando={enviando} textoCarregando="Enviando…" disabled={!email.trim()}>
            Enviar convite
          </Botao>
        </form>
      )}
    </div>
  );
}

export function SairDaEquipe({ membroId, titular }: { membroId: string; titular: string }) {
  const router = useRouter();
  const { confirmar, dialogo } = useConfirmacao();
  return (
    <>
      {dialogo}
      <button
        type="button"
        className="link link--sublinhado link--perigo"
        onClick={async () => {
          const ok = await confirmar({ titulo: `Sair da equipe de ${titular}?`, texto: "Você perde o acesso aos cursos do plano.", confirmar: "Sair da equipe", perigo: true });
          if (!ok) return;
          const r = await enviar(`/api/me/participacoes/${membroId}`, null, "DELETE");
          if (r.ok) router.refresh();
        }}
      >
        Sair da equipe
      </button>
    </>
  );
}

/** Página do convite: aceitar com a conta certa. */
export function AceitarConvite({ token }: { token: string }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="acoes">
      <Botao
        carregando={enviando}
        textoCarregando="Entrando na equipe…"
        onClick={async () => {
          setEnviando(true);
          setErro(null);
          const r = await enviar(`/api/equipe/convites/${encodeURIComponent(token)}/aceitar`, {});
          setEnviando(false);
          if (!r.ok) return setErro(r.mensagem);
          router.push("/minha-conta/cursos");
          router.refresh();
        }}
      >
        Aceitar convite
      </Botao>
      {erro && <Aviso tipo="erro" titulo={erro} />}
    </div>
  );
}

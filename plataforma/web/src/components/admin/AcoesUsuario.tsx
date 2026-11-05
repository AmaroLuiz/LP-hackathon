"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso } from "@/components/ui/Exibicao";
import { GrupoRadio, Selecao } from "@/components/ui/Formulario";
import type { FichaUsuario } from "@/lib/admin";
import { enviar } from "@/lib/cliente";

type Conta = FichaUsuario["conta"];

/**
 * Ações de suporte numa conta. Toda ação pede confirmação, vai para a auditoria
 * e, quando muda papel, bloqueio ou senha, derruba as sessões da pessoa.
 */
export function AcoesUsuario({ conta, ehVoce }: { conta: Conta; ehVoce: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();
  const router = useRouter();
  const bloqueada = conta.bloqueadoEm !== null;

  async function fazer(caminho: string, corpo: unknown, feito: string, metodo: "POST" | "DELETE" = "POST") {
    setOcupado(true);
    const r = await enviar(`/api/admin/usuarios/${conta.id}/${caminho}`, corpo, metodo);
    setOcupado(false);
    if (!r.ok) return avisar(r.mensagem, "erro");
    avisar(feito);
    router.refresh();
  }

  if (ehVoce) {
    return (
      <Aviso tipo="info" titulo="Esta é a sua conta.">
        Por segurança, papel, bloqueio e senha da própria conta não mudam por aqui. Use &quot;Trocar senha&quot; no menu da conta.
      </Aviso>
    );
  }

  return (
    <div className="acoes-usuario">
      {dialogo}
      <Botao
        pequeno
        variante="secundario"
        disabled={ocupado}
        onClick={async () => {
          const admin = conta.papel === "ADMIN";
          const ok = await confirmar({
            titulo: admin ? `Tirar o acesso de admin de ${conta.nome}?` : `Tornar ${conta.nome} admin?`,
            texto: admin
              ? "A pessoa volta a ser aluna e perde o painel na hora (as sessões abertas caem)."
              : "Admin edita cursos, vê todos os usuários e concede acessos. As sessões abertas caem e a pessoa entra de novo já como admin.",
            confirmar: admin ? "Rebaixar a aluno" : "Promover a admin",
            perigo: admin,
          });
          if (ok) void fazer("papel", { papel: admin ? "USUARIO" : "ADMIN" }, admin ? "Agora é aluno." : "Agora é admin.");
        }}
      >
        {conta.papel === "ADMIN" ? "Rebaixar a aluno" : "Promover a admin"}
      </Botao>
      {!conta.emailVerificadoEm && (
        <Botao pequeno variante="secundario" disabled={ocupado} onClick={() => fazer("reenviar-verificacao", {}, "E-mail de confirmação reenviado.")}>
          Reenviar confirmação de e-mail
        </Botao>
      )}
      <Botao
        pequeno
        variante="secundario"
        disabled={ocupado}
        onClick={async () => {
          const ok = await confirmar({
            titulo: "Exigir uma senha nova?",
            texto: "A senha atual deixa de valer, as sessões caem e a pessoa recebe por e-mail o link para criar outra. Use quando houver suspeita de acesso indevido.",
            confirmar: "Exigir senha nova",
            perigo: true,
          });
          if (ok) void fazer("redefinir-senha", {}, "Link de nova senha enviado.");
        }}
      >
        Exigir senha nova
      </Botao>
      <Botao
        pequeno
        variante="secundario"
        disabled={ocupado || conta.sessoes.length === 0}
        onClick={async () => {
          if (await confirmar({ titulo: "Encerrar as sessões?", texto: "A pessoa sai de todos os aparelhos e precisa entrar de novo.", confirmar: "Encerrar sessões" }))
            void fazer("sessoes", null, "Sessões encerradas.", "DELETE");
        }}
      >
        Encerrar sessões
      </Botao>
      <Botao
        pequeno
        variante={bloqueada ? "secundario" : "perigo"}
        disabled={ocupado}
        onClick={async () => {
          const ok = await confirmar({
            titulo: bloqueada ? `Desbloquear ${conta.nome}?` : `Bloquear ${conta.nome}?`,
            texto: bloqueada
              ? "A pessoa volta a entrar com a senha de sempre."
              : "A pessoa sai na hora e não consegue mais entrar. A assinatura não é cancelada por aqui.",
            confirmar: bloqueada ? "Desbloquear" : "Bloquear conta",
            perigo: !bloqueada,
          });
          if (ok) void fazer("bloqueio", { bloquear: !bloqueada }, bloqueada ? "Conta desbloqueada." : "Conta bloqueada.");
        }}
      >
        {bloqueada ? "Desbloquear conta" : "Bloquear conta"}
      </Botao>
    </div>
  );
}

/** Acesso manual (cortesia, parceria, suporte) a um curso ou a um plano inteiro. */
export function ConcederAcesso({
  usuarioId,
  cursos,
  planos,
}: {
  usuarioId: string;
  cursos: { id: number; titulo: string }[];
  planos: { id: string; nome: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"curso" | "plano">("curso");
  const [curso, setCurso] = useState(String(cursos[0]?.id ?? ""));
  const [plano, setPlano] = useState(planos[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const [validade, setValidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const { avisar } = useAvisos();
  const router = useRouter();

  async function conceder(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    // Validade até o fim do dia escolhido, no horário de Brasília.
    const expiraEm = validade ? new Date(`${validade}T23:59:59-03:00`).toISOString() : null;
    const r = await enviar(`/api/admin/usuarios/${usuarioId}/acessos`, {
      cursoId: tipo === "curso" ? Number(curso) : null,
      planoId: tipo === "plano" ? plano : null,
      motivo,
      expiraEm,
    });
    setEnviando(false);
    if (!r.ok) {
      setCampos(r.campos);
      setErro(Object.keys(r.campos).length ? null : r.mensagem);
      return;
    }
    avisar("Acesso concedido.");
    setAberto(false);
    setMotivo("");
    setValidade("");
    router.refresh();
  }

  if (!aberto) {
    return (
      <Botao pequeno variante="secundario" onClick={() => setAberto(true)}>
        Conceder acesso
      </Botao>
    );
  }

  return (
    <form className="formulario formulario--compacto" onSubmit={conceder} noValidate>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <GrupoRadio
        nome="tipo-acesso"
        legenda="Acesso a"
        valor={tipo}
        aoMudar={setTipo}
        opcoes={[
          ["curso", "Um curso"],
          ["plano", "Todos os cursos de um plano"],
        ]}
      />
      {tipo === "curso" ? (
        <Selecao id="acesso-curso" rotulo="Curso" value={curso} erro={campos.cursoId} onChange={(e) => setCurso(e.target.value)}>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
        </Selecao>
      ) : (
        <Selecao id="acesso-plano" rotulo="Plano" value={plano} onChange={(e) => setPlano(e.target.value)}>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Selecao>
      )}
      <Campo id="acesso-motivo" rotulo="Motivo" required maxLength={300} value={motivo} erro={campos.motivo} ajuda="Fica registrado. Ex.: “Parceria com a associação comercial”." onChange={(e) => setMotivo(e.target.value)} />
      <Campo id="acesso-validade" rotulo="Válido até (opcional)" type="date" value={validade} erro={campos.expiraEm} ajuda="Vazio: sem data para acabar." onChange={(e) => setValidade(e.target.value)} />
      <div className="acoes acoes--compactas">
        <Botao type="submit" pequeno carregando={enviando} textoCarregando="Concedendo…">
          Conceder acesso
        </Botao>
        <Botao pequeno variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

export function RevogarAcesso({ usuarioId, acessoId, descricao }: { usuarioId: string; acessoId: string; descricao: string }) {
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();
  const router = useRouter();
  return (
    <>
      {dialogo}
      <button
        type="button"
        className="link link--sublinhado link--perigo"
        onClick={async () => {
          if (!(await confirmar({ titulo: "Revogar este acesso?", texto: descricao, confirmar: "Revogar", perigo: true }))) return;
          const r = await enviar(`/api/admin/usuarios/${usuarioId}/acessos/${acessoId}`, null, "DELETE");
          if (!r.ok) return avisar(r.mensagem, "erro");
          avisar("Acesso revogado.");
          router.refresh();
        }}
      >
        Revogar<span className="sr-only"> {descricao}</span>
      </button>
    </>
  );
}

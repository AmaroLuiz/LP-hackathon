"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { Aviso, Selo } from "@/components/ui/Exibicao";
import { Alternador } from "@/components/ui/Formulario";
import { Modal } from "@/components/ui/Modal";
import { enviar } from "@/lib/cliente";
import { dataPorExtenso } from "@/lib/formato";
import type { SessaoAtiva, Usuario } from "@/lib/sessao";
import { useFormulario } from "./useFormulario";

/** Nome, dados do negócio, cidade, telefone e e-mails de novidades. */
export function FormPerfil({ usuario }: { usuario: Usuario }) {
  const router = useRouter();
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [dados, setDados] = useState({
    nome: usuario.nome,
    nomeNegocio: usuario.nomeNegocio ?? "",
    segmentoNegocio: usuario.segmentoNegocio ?? "",
    cidade: usuario.cidade ?? "",
    telefone: usuario.telefone ?? "",
  });
  const [marketing, setMarketing] = useState(usuario.aceitouMarketing);
  const [salvo, setSalvo] = useState(false);

  const campo = (nome: keyof typeof dados) => ({
    value: dados[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setDados((d) => ({ ...d, [nome]: e.target.value }));
      setSalvo(false);
      limparErro(nome);
    },
    erro: erros[nome],
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter("/api/me", { ...dados, aceitouMarketing: marketing }, "PATCH");
    if (r.ok) {
      setSalvo(true);
      router.refresh();
    }
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={salvar} noValidate aria-labelledby="perfil-dados">
      <h2 id="perfil-dados" className="perfil__titulo">
        Seus dados
      </h2>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <Campo id="perfil-nome" rotulo="Nome" autoComplete="name" maxLength={120} required {...campo("nome")} />
      <Campo id="perfil-negocio" rotulo="Nome do negócio" autoComplete="organization" maxLength={120} {...campo("nomeNegocio")} />
      <Campo id="perfil-segmento" rotulo="Segmento" maxLength={80} ajuda="Ex.: confeitaria, salão de beleza, loja de roupas." {...campo("segmentoNegocio")} />
      <Campo id="perfil-cidade" rotulo="Cidade" autoComplete="address-level2" maxLength={120} {...campo("cidade")} />
      <Campo id="perfil-telefone" rotulo="Telefone" type="tel" autoComplete="tel" maxLength={30} {...campo("telefone")} />
      <Alternador
        id="perfil-marketing"
        rotulo="Quero receber novidades por e-mail"
        ajuda="Cursos novos e dicas, no máximo uma vez por semana. E-mails da sua conta e da assinatura chegam de qualquer jeito."
        ligado={marketing}
        aoMudar={(v) => {
          setMarketing(v);
          setSalvo(false);
        }}
      />
      {salvo && <Aviso tipo="sucesso" titulo="Dados salvos." />}
      <Botao type="submit" carregando={enviando} textoCarregando="Salvando…">
        Salvar dados
      </Botao>
    </form>
  );
}

/** Troca de e-mail: o novo só vale depois do clique no link enviado a ele. */
export function FormTrocarEmail({ usuario }: { usuario: Usuario }) {
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const [novoEmail, setNovoEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [pendente, setPendente] = useState(usuario.emailPendente);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter("/api/me/email", { novoEmail, senha });
    if (r.ok) {
      setPendente(novoEmail.trim().toLowerCase());
      setNovoEmail("");
      setSenha("");
    }
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={pedir} noValidate aria-labelledby="perfil-email">
      <h2 id="perfil-email" className="perfil__titulo">
        E-mail de acesso
      </h2>
      <p className="perfil__atual">
        {usuario.email}{" "}
        {usuario.emailVerificado ? <Selo tom="salvia">Confirmado</Selo> : <Selo tom="ouro">Aguardando confirmação</Selo>}
        {usuario.googleLigado && <Selo>Conta Google ligada</Selo>}
      </p>
      {pendente && (
        <Aviso tipo="info" titulo={`Falta confirmar ${pendente}.`}>
          Abra o link que mandamos para esse endereço. Até lá, o e-mail atual continua valendo.
        </Aviso>
      )}
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <Campo
        id="email-novo"
        rotulo="Novo e-mail"
        type="email"
        autoComplete="email"
        value={novoEmail}
        onChange={(e) => {
          setNovoEmail(e.target.value);
          limparErro("novoEmail");
        }}
        erro={erros.novoEmail}
        required
      />
      <CampoSenha
        id="email-senha"
        rotulo="Sua senha"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => {
          setSenha(e.target.value);
          limparErro("senha");
        }}
        erro={erros.senha}
        ajuda={usuario.googleLigado ? "Entrou só com o Google? Crie uma senha em “Esqueci minha senha” na tela de entrada." : undefined}
        required
      />
      <Botao type="submit" variante="secundario" carregando={enviando} textoCarregando="Enviando…">
        Enviar link de confirmação
      </Botao>
    </form>
  );
}

/** Sessões abertas: encerra as que a pessoa não reconhece. */
export function SessoesAtivas({ inicial }: { inicial: SessaoAtiva[] }) {
  const [sessoes, setSessoes] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);

  async function encerrar(id: string) {
    const r = await enviar(`/api/me/sessoes/${id}`, null, "DELETE");
    if (r.ok || r.status === 404) setSessoes((s) => s.filter((x) => x.id !== id));
    else setErro(r.mensagem);
  }

  return (
    <section className="perfil__bloco" aria-labelledby="perfil-sessoes">
      <h2 id="perfil-sessoes" className="perfil__titulo">
        Onde você está conectado
      </h2>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <ul className="sessoes">
        {sessoes.map((s) => (
          <li key={s.id} className="sessao">
            <div>
              <p className="sessao__aparelho">
                {s.aparelho} {s.atual && <Selo tom="salvia">Este aparelho</Selo>}
              </p>
              <p className="sessao__datas">
                Entrou em {dataPorExtenso(s.criadaEm)} · último uso em {dataPorExtenso(s.ultimoUso)}
              </p>
            </div>
            {!s.atual && (
              <Botao variante="fantasma" pequeno onClick={() => encerrar(s.id)}>
                Encerrar
              </Botao>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** LGPD: baixar os dados (JSON) e excluir a conta (digitando o e-mail). */
export function Privacidade({ email }: { email: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const confere = digitado.trim().toLowerCase() === email.toLowerCase();

  async function excluir(e: React.FormEvent) {
    e.preventDefault();
    setExcluindo(true);
    setErro(null);
    const r = await enviar("/api/me", { email: digitado }, "DELETE");
    if (!r.ok) {
      setExcluindo(false);
      setErro(r.campos.email ?? r.mensagem);
      return;
    }
    // Sessão encerrada na API: as partes do servidor voltam a ver um visitante.
    router.replace("/?conta=excluida");
    router.refresh();
  }

  return (
    <section className="perfil__bloco" aria-labelledby="perfil-privacidade">
      <h2 id="perfil-privacidade" className="perfil__titulo">
        Privacidade e dados
      </h2>
      <p className="perfil__texto">
        Você pode baixar tudo o que a PotencIA guarda sobre você, a qualquer momento. Detalhes na{" "}
        <a href="/privacidade" className="link link--sublinhado">
          Política de privacidade
        </a>
        .
      </p>
      <div className="acoes">
        <a href="/api/me/dados" className="botao botao--secundario" download>
          Baixar meus dados
        </a>
        <Botao variante="perigo" onClick={() => setAberto(true)}>
          Excluir minha conta
        </Botao>
      </div>

      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Excluir sua conta" chao="papel">
        <form className="formulario" onSubmit={excluir} noValidate>
          <p>Isto não dá para desfazer. Ao excluir a conta:</p>
          <ul className="perfil__lista">
            <li>a assinatura é cancelada na hora, sem novas cobranças;</li>
            <li>progresso, anotações, certificados e avaliações são apagados;</li>
            <li>suas perguntas e respostas deixam de aparecer;</li>
            <li>nome, e-mail e dados do negócio são apagados. Ficam só os registros de pagamento que a lei manda guardar, sem o seu nome.</li>
          </ul>
          <Campo
            id="excluir-email"
            rotulo={`Para confirmar, digite ${email}`}
            type="email"
            autoComplete="off"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            erro={erro ?? undefined}
          />
          <div className="acoes">
            <Botao variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="perigo" disabled={!confere} carregando={excluindo} textoCarregando="Excluindo…">
              Excluir minha conta
            </Botao>
          </div>
        </form>
      </Modal>
    </section>
  );
}

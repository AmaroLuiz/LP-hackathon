import type { CursoCard, Nivel } from "./api";
import type { MatriculaResumo } from "./aprender";

// Tipos das respostas do painel admin (/api/admin/**). Formato único de
// paginação da API: { itens, pagina, tamanho, total }, com página a partir de 1.

export type Pagina<T> = { itens: T[]; pagina: number; tamanho: number; total: number };

export type StatusCurso = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";

export type TipoAula = "VIDEO" | "TEXTO" | "MATERIAL" | "EXERCICIO";

export const STATUS_CURSO: Record<StatusCurso, { texto: string; tom: "ouro" | "salvia" | "neutro" }> = {
  PUBLICADO: { texto: "Publicado", tom: "salvia" },
  RASCUNHO: { texto: "Rascunho", tom: "ouro" },
  ARQUIVADO: { texto: "Arquivado", tom: "neutro" },
};

export const TIPOS_AULA: Record<TipoAula, string> = {
  VIDEO: "Vídeo",
  TEXTO: "Texto",
  EXERCICIO: "Exercício",
  MATERIAL: "Material para baixar",
};

export type CursoLinha = {
  id: number;
  slug: string;
  numero: number;
  titulo: string;
  status: StatusCurso;
  capaUrl: string | null;
  categoria: string;
  destaque: boolean;
  totalAulas: number;
  duracaoSegundos: number;
  totalAlunos: number;
  notaMedia: number;
  totalAvaliacoes: number;
  publicadoEm: string | null;
  atualizadoEm: string;
};

export type MaterialAdmin = { id: number; nome: string; chave: string; tamanhoBytes: number | null; tipoMime: string | null };

export type AulaAdmin = {
  id: number;
  ordem: number;
  titulo: string;
  tipo: TipoAula;
  resumo: string | null;
  conteudo: string | null;
  videoId: string | null;
  duracaoSegundos: number | null;
  previa: boolean;
  legendaUrl: string | null;
  publicada: boolean;
  materiais: MaterialAdmin[];
};

export type ModuloAdmin = { id: number; ordem: number; titulo: string; descricao: string | null; aulas: AulaAdmin[] };

export type CursoEdicao = {
  id: number;
  slug: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  descricao: string | null;
  capaUrl: string | null;
  capaAlt: string | null;
  nivel: Nivel;
  idioma: string;
  categoriaId: number;
  ferramentas: string[];
  oQueAprende: string[];
  requisitos: string[];
  paraQuemE: string[];
  resultadoFinal: string;
  status: StatusCurso;
  destaque: boolean;
  certificadoHabilitado: boolean;
  cargaHorariaMinutos: number | null;
  seoTitulo: string | null;
  seoDescricao: string | null;
  instrutores: number[];
  publicadoEm: string | null;
  atualizadoEm: string;
  totalAlunos: number;
  totalAulasPublicadas: number;
  duracaoPublicadaSegundos: number;
  modulos: ModuloAdmin[];
};

export type ItemChecklist = { id: string; texto: string; ok: boolean; obrigatorio: boolean };
export type Checklist = { podePublicar: boolean; itens: ItemChecklist[] };

export type PlanoDoCurso = { id: string; nome: string; precoCentavos: number; incluido: boolean };

export type CategoriaAdmin = { id: number; slug: string; nome: string; descricao: string | null; ordem: number; totalCursos: number };

export type InstrutorAdmin = { id: number; nome: string; titulo: string | null; bio: string | null; fotoUrl: string | null; totalCursos: number };

// --- Usuários ---------------------------------------------------------------

export type Papel = "USUARIO" | "ADMIN";

export type UsuarioItem = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  emailVerificado: boolean;
  bloqueado: boolean;
  plano: string | null;
  criadoEm: string;
  ultimoAcessoEm: string | null;
};

export type RegistroAuditoria = {
  id: string;
  quando: string;
  autorId: string | null;
  autorEmail: string | null;
  acao: string;
  alvoTipo: string;
  alvoId: string;
  resumo: string | null;
  antes: Record<string, unknown>;
  depois: Record<string, unknown>;
  ip: string | null;
};

export type FichaUsuario = {
  conta: {
    id: string;
    nome: string;
    email: string;
    papel: Papel;
    emailVerificadoEm: string | null;
    bloqueadoEm: string | null;
    deveTrocarSenha: boolean;
    segmentoNegocio: string | null;
    nomeNegocio: string | null;
    objetivo: string | null;
    familiaridade: string | null;
    aceitouMarketing: boolean;
    aceitouTermosEm: string;
    criadoEm: string;
    ultimoAcessoEm: string | null;
    sessoes: { criadaEm: string; ultimoUso: string }[];
  };
  assinatura: {
    id: string;
    planoId: string;
    planoNome: string;
    status: "PENDENTE" | "ATIVA" | "EM_ATRASO" | "CANCELADA" | "EXPIRADA";
    daAcesso: boolean;
    inicio: string;
    fimPeriodoAtual: string;
  } | null;
  acessos: {
    id: string;
    cursoId: number | null;
    curso: string | null;
    planoId: string | null;
    plano: string | null;
    motivo: string;
    concedidoPor: string;
    expiraEm: string | null;
    criadoEm: string;
    vigente: boolean;
  }[];
  cursos: { card: CursoCard; matricula: MatriculaResumo }[];
  historico: RegistroAuditoria[];
};

// --- Visão geral ------------------------------------------------------------

export type Metricas = {
  geradoEm: string;
  alunos: number;
  verificados: number;
  novos7: number;
  novos30: number;
  cadastrosPorDia: { dia: string; cadastros: number }[];
  ativos7: number;
  ativos30: number;
  assinaturasAtivas: number;
  receitaMensalCentavos: number;
  receitaConfirmadaNoMesCentavos: number;
  emAtraso: number;
  fundadores: number;
  cancelamentosNoMes: number;
  ativasPorPlano: { planoId: string; nome: string; precoCentavos: number; assinaturas: number }[];
  receitaPorMes: { mes: string; centavos: number }[];
  conclusaoPorCurso: { cursoId: number; numero: number; titulo: string; matriculas: number; concluidas: number; taxa: number }[];
  aulasParadas: { aulaId: number; aula: string; curso: string; alunos: number }[];
};

// --- Ações de auditoria em português ----------------------------------------

export const ACOES: Record<string, string> = {
  "curso.criado": "Curso criado",
  "curso.editado": "Curso editado",
  "curso.publicado": "Curso publicado",
  "curso.despublicado": "Curso despublicado",
  "curso.arquivado": "Curso arquivado",
  "curso.duplicado": "Curso duplicado",
  "curso.planos": "Planos do curso",
  "modulo.criado": "Módulo criado",
  "modulo.editado": "Módulo editado",
  "modulo.excluido": "Módulo excluído",
  "aula.criada": "Aula criada",
  "aula.editada": "Aula editada",
  "aula.excluida": "Aula excluída",
  "material.adicionado": "Material anexado",
  "material.excluido": "Material removido",
  "curriculo.reordenado": "Currículo reordenado",
  "categoria.criada": "Tema criado",
  "categoria.editado": "Tema editado",
  "categoria.excluida": "Tema excluído",
  "categoria.reordenada": "Temas reordenados",
  "instrutor.criado": "Instrutor cadastrado",
  "instrutor.editado": "Instrutor editado",
  "instrutor.excluido": "Instrutor excluído",
  "usuario.papel": "Papel alterado",
  "usuario.bloqueado": "Conta bloqueada",
  "usuario.desbloqueado": "Conta desbloqueada",
  "usuario.verificacao_reenviada": "Confirmação reenviada",
  "usuario.redefinicao_forcada": "Nova senha exigida",
  "usuario.sessoes_encerradas": "Sessões encerradas",
  "acesso.concedido": "Acesso concedido",
  "acesso.revogado": "Acesso revogado",
  "assinatura.plano": "Troca de plano",
  "assinatura.cancelada": "Assinatura cancelada",
  "assinatura.reativada": "Assinatura reativada",
  "equipe.convite": "Convite para a equipe",
  "equipe.remocao": "Saída da equipe",
  "plano.editado": "Plano editado",
  "fundador.editado": "Condição de fundador",
  "fundador.lista": "Lista de espera",
  "gateway.reprocessado": "Evento reprocessado",
  "conta.login": "Entrada na conta",
  "conta.senha_trocada": "Senha trocada",
  "conta.senha_redefinida": "Senha redefinida",
};

export function nomeDaAcao(acao: string) {
  return ACOES[acao] ?? acao;
}

/** "Fotos de Produto!" → "fotos-de-produto" (mesma regra da API). */
export function slugDe(texto: string): string {
  const slug = texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
  return slug || "curso";
}

/** 1536 → "1,5 KB". */
export function tamanhoArquivo(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const unidades = ["bytes", "KB", "MB", "GB"];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const texto = i === 0 ? String(valor) : valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${texto} ${unidades[i]}`;
}

/** Move um item de `de` para `para` (reordenação por botões e por arrastar). */
export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  if (de === para || de < 0 || de >= lista.length) return [...lista];
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(Math.max(0, Math.min(para, copia.length)), 0, item);
  return copia;
}

/** Move a aula para (módulo, posição), tirando-a de onde estava. */
export function moverAula(modulos: ModuloAdmin[], aulaId: number, moduloId: number, indice: number): ModuloAdmin[] {
  const aula = modulos.flatMap((m) => m.aulas).find((a) => a.id === aulaId);
  if (!aula) return modulos;
  const origem = modulos.find((m) => m.aulas.some((a) => a.id === aulaId))!;
  const indiceOrigem = origem.aulas.findIndex((a) => a.id === aulaId);
  // Soltar mais abaixo no mesmo módulo: a própria aula sai antes, então o índice anda um.
  const ajuste = origem.id === moduloId && indiceOrigem < indice ? 1 : 0;
  const semAula = modulos.map((m) => ({ ...m, aulas: m.aulas.filter((a) => a.id !== aulaId) }));
  return semAula.map((m) => {
    if (m.id !== moduloId) return m;
    const aulas = [...m.aulas];
    aulas.splice(Math.max(0, Math.min(indice - ajuste, aulas.length)), 0, aula);
    return { ...m, aulas };
  });
}

/** "12:05" → 725; "1:02:05" → 3725; vazio → null; inválido → NaN. */
export function lerDuracao(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  if (!/^\d{1,3}(:[0-5]\d){1,2}$/.test(t)) return Number.NaN;
  return t.split(":").reduce((total, parte) => total * 60 + Number(parte), 0);
}

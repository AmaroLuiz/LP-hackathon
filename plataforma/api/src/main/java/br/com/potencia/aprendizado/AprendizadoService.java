package br.com.potencia.aprendizado;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.aprendizado.Acesso.Decisao;
import br.com.potencia.aprendizado.Acesso.Motivo;
import br.com.potencia.aprendizado.AprendizadoDtos.AcessoCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.AnotacaoResposta;
import br.com.potencia.aprendizado.AprendizadoDtos.AulaPainel;
import br.com.potencia.aprendizado.AprendizadoDtos.AulaPlayer;
import br.com.potencia.aprendizado.AprendizadoDtos.CertificadoResposta;
import br.com.potencia.aprendizado.AprendizadoDtos.Conclusao;
import br.com.potencia.aprendizado.AprendizadoDtos.MaterialAula;
import br.com.potencia.aprendizado.AprendizadoDtos.MatriculaResumo;
import br.com.potencia.aprendizado.AprendizadoDtos.MeuCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.ModuloPainel;
import br.com.potencia.aprendizado.AprendizadoDtos.PainelCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.Previa;
import br.com.potencia.aprendizado.AprendizadoDtos.Resumo;
import br.com.potencia.aprendizado.AprendizadoDtos.Video;
import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.catalogo.CatalogoDtos.AulaDados;
import br.com.potencia.catalogo.CatalogoDtos.AulaItem;
import br.com.potencia.catalogo.CatalogoDtos.CurriculoDados;
import br.com.potencia.catalogo.CatalogoDtos.CursoCard;
import br.com.potencia.catalogo.CatalogoService;
import br.com.potencia.catalogo.TipoAula;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.contas.ContaService;
import br.com.potencia.contas.ContasDtos.UsuarioResposta;
import br.com.potencia.contas.UsuarioSessao;
import br.com.potencia.midia.Envios;
import br.com.potencia.midia.ProvedorVideo;

/**
 * Matrícula, player, progresso, conclusão e certificado. Toda leitura de aula
 * passa pela regra única de {@link Acesso}.
 */
@Service
@Transactional
public class AprendizadoService {

	private static final String ALFABETO_CODIGO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

	private static final SecureRandom ALEATORIO = new SecureRandom();

	/** Validade dos links assinados de materiais (o player é reaberto ao trocar de aula). */
	static final Duration VALIDADE_LINKS = Duration.ofHours(2);

	/** Sem abrir o curso há esse tempo, o aluno conta como parado na última aula que viu. */
	static final Duration PARADO_HA = Duration.ofDays(14);

	private final CatalogoService catalogo;

	private final AssinaturasService assinaturas;

	private final ContaService contas;

	private final ObjectProvider<ProvedorVideo> videos;

	private final Envios envios;

	private final MatriculaRepository matriculas;

	private final ProgressoAulaRepository progressos;

	private final AnotacaoRepository anotacoes;

	private final ListaDesejosRepository desejos;

	private final CertificadoRepository certificados;

	private final Clock relogio;

	AprendizadoService(CatalogoService catalogo, AssinaturasService assinaturas, ContaService contas,
			ObjectProvider<ProvedorVideo> videos, Envios envios, MatriculaRepository matriculas,
			ProgressoAulaRepository progressos, AnotacaoRepository anotacoes, ListaDesejosRepository desejos,
			CertificadoRepository certificados, Clock relogio) {
		this.catalogo = catalogo;
		this.assinaturas = assinaturas;
		this.contas = contas;
		this.videos = videos;
		this.envios = envios;
		this.matriculas = matriculas;
		this.progressos = progressos;
		this.anotacoes = anotacoes;
		this.desejos = desejos;
		this.certificados = certificados;
		this.relogio = relogio;
	}

	// --- Acesso ---------------------------------------------------------------

	private Decisao decidir(UsuarioResposta usuario, long cursoId, boolean previa, boolean publicado) {
		var origem = usuario == null ? null : assinaturas.cursosLiberados(usuario.id()).get(cursoId);
		return Acesso.decidir(usuario == null ? null : usuario.papel(), usuario != null && usuario.emailVerificado(),
				origem, previa, publicado);
	}

	private UsuarioResposta conta(UsuarioSessao sessao) {
		return contas.buscar(sessao.id()).orElseThrow(() -> ErroApi.naoAutenticado("Sua sessão terminou. Entre de novo."));
	}

	private static ErroApi semAcesso(Motivo motivo) {
		return switch (motivo) {
			case EMAIL_NAO_VERIFICADO -> ErroApi.proibido(motivo.name(),
					"Confirme seu e-mail para assistir às aulas. O link está na sua caixa de entrada.");
			case INDISPONIVEL -> ErroApi.naoEncontrado("Esta aula não está disponível.");
			default -> ErroApi.proibido(motivo.name(), "Esta aula faz parte de um plano. Assine para assistir.");
		};
	}

	@Transactional(readOnly = true)
	public AcessoCurso acessoAoCurso(UsuarioSessao sessao, String slug) {
		var curriculo = curriculoPublicado(slug);
		var usuario = conta(sessao);
		var decisao = decidir(usuario, curriculo.cursoId(), false, curriculo.publicado());
		var matricula = matriculas.findByUsuarioIdAndCursoId(usuario.id(), curriculo.cursoId())
			.map(m -> resumo(usuario.id(), m, curriculo))
			.orElse(null);
		var primeira = curriculo.aulasEmOrdem().stream().findFirst().map(AulaItem::id).orElse(null);
		return new AcessoCurso(decisao.pode(), decisao.motivo(), matricula, primeira);
	}

	/** Se a pessoa pode abrir a aula agora (mesma regra do player; usada pelas perguntas). */
	@Transactional(readOnly = true)
	public boolean podeVerAula(UsuarioSessao sessao, long aulaId) {
		return catalogo.aula(aulaId)
			.map(a -> decidir(conta(sessao), a.cursoId(), a.previa(), a.cursoPublicado() && a.publicada()).pode())
			.orElse(false);
	}

	/** Quanto do curso a pessoa já concluiu (0 a 100). */
	@Transactional(readOnly = true)
	public int percentualConcluido(UUID usuarioId, long cursoId) {
		return catalogo.curriculo(cursoId).map(c -> {
			var aulas = c.aulasEmOrdem();
			return percentual(concluidas(usuarioId, aulas).size(), aulas.size());
		}).orElse(0);
	}

	// --- Painel do curso e player --------------------------------------------

	@Transactional(readOnly = true)
	public PainelCurso painel(UsuarioSessao sessao, String slug) {
		var curriculo = curriculoPublicado(slug);
		var usuario = conta(sessao);
		var decisao = decidir(usuario, curriculo.cursoId(), false, curriculo.publicado());
		if (!decisao.pode()) {
			throw semAcesso(decisao.motivo());
		}
		var aulas = curriculo.aulasEmOrdem();
		var concluidas = concluidas(usuario.id(), aulas);
		var matricula = matriculas.findByUsuarioIdAndCursoId(usuario.id(), curriculo.cursoId());
		var modulos = curriculo.modulos()
			.stream()
			.map(m -> new ModuloPainel(m.titulo(),
					m.aulas()
						.stream()
						.map(a -> new AulaPainel(a.id(), a.titulo(), a.tipo(), a.duracaoSegundos(), a.previa(),
								concluidas.contains(a.id())))
						.toList(),
					(int) m.aulas().stream().filter(a -> concluidas.contains(a.id())).count()))
			.toList();
		// Continua de onde parou; se a última já foi concluída, segue para a próxima pendente.
		Long continuar = matricula.map(Matricula::getUltimaAulaId)
			.filter(id -> !concluidas.contains(id))
			.orElseGet(() -> aulas.stream().filter(a -> !concluidas.contains(a.id())).findFirst()
				.or(() -> aulas.stream().findFirst())
				.map(AulaItem::id)
				.orElse(null));
		int feitas = (int) aulas.stream().filter(a -> concluidas.contains(a.id())).count();
		return new PainelCurso(curriculo.cursoId(), curriculo.slug(), curriculo.titulo(), curriculo.numero(),
				curriculo.certificadoHabilitado(), modulos, feitas, aulas.size(), percentual(feitas, aulas.size()),
				matricula.map(m -> m.getConcluidaEm() != null).orElse(false), continuar,
				certificados.findByUsuarioIdAndCursoId(usuario.id(), curriculo.cursoId())
					.map(Certificado::getCodigo)
					.orElse(null));
	}

	/** Abre uma aula no player: confere o acesso, matricula na primeira vez e guarda a última aula. */
	public AulaPlayer abrirAula(UsuarioSessao sessao, long aulaId) {
		var aula = catalogo.aula(aulaId).orElseThrow(() -> ErroApi.naoEncontrado("Aula não encontrada."));
		var usuario = conta(sessao);
		var decisao = decidir(usuario, aula.cursoId(), false, aula.cursoPublicado() && aula.publicada());
		if (!decisao.pode()) {
			throw semAcesso(decisao.motivo());
		}
		var agora = relogio.instant();
		var curriculo = catalogo.curriculo(aula.cursoId()).orElseThrow();
		var matricula = matriculas.findByUsuarioIdAndCursoId(usuario.id(), aula.cursoId()).orElseGet(() -> {
			catalogo.registrarNovoAluno(aula.cursoId());
			return matriculas.save(Matricula.nova(usuario.id(), aula.cursoId(), agora));
		});
		matricula.abriuAula(aulaId, agora);

		var ordem = curriculo.aulasEmOrdem();
		int indice = indiceDe(ordem, aulaId);
		var anterior = indice > 0 ? ordem.get(indice - 1) : null;
		var proxima = indice >= 0 && indice < ordem.size() - 1 ? ordem.get(indice + 1) : null;
		var progresso = progressos.findById(new ProgressoAula.Chave(usuario.id(), aulaId));
		return new AulaPlayer(aula.id(), aula.cursoSlug(), aula.cursoTitulo(), aula.moduloTitulo(), aula.titulo(),
				aula.tipo(), aula.resumo(), aula.conteudo(), video(aula), aula.duracaoSegundos(),
				progresso.map(ProgressoAula::getPosicaoSegundos).orElse(0),
				progresso.map(ProgressoAula::isConcluida).orElse(false), anterior == null ? null : anterior.id(),
				proxima == null ? null : proxima.id(), proxima == null ? null : proxima.titulo(), indice + 1,
				ordem.size(),
				aula.materiais()
					.stream()
					.map(m -> new MaterialAula(m.nome(), envios.urlPrivada(m.chave(), VALIDADE_LINKS, m.nome()),
							m.tamanhoBytes()))
					.toList());
	}

	/** Prévia: pública, só para aulas marcadas como prévia de cursos publicados. */
	@Transactional(readOnly = true)
	public Optional<Previa> previa(long aulaId) {
		return catalogo.aula(aulaId)
			.filter(a -> a.previa() && a.publicada() && a.cursoPublicado())
			.map(a -> new Previa(a.id(), a.titulo(), a.cursoTitulo(), a.duracaoSegundos(), video(a)));
	}

	public void salvarPosicao(UsuarioSessao sessao, long aulaId, int segundos) {
		var aula = aulaComAcesso(sessao, aulaId);
		var agora = relogio.instant();
		progresso(sessao.id(), aula.id(), agora).posicao(segundos, agora);
	}

	public Conclusao definirConclusao(UsuarioSessao sessao, long aulaId, boolean concluida) {
		var aula = aulaComAcesso(sessao, aulaId);
		var agora = relogio.instant();
		progresso(sessao.id(), aula.id(), agora).concluida(concluida, agora);
		progressos.flush();

		var curriculo = catalogo.curriculo(aula.cursoId()).orElseThrow();
		var aulas = curriculo.aulasEmOrdem();
		var feitas = concluidas(sessao.id(), aulas);
		boolean cursoConcluido = !aulas.isEmpty() && feitas.size() == aulas.size();
		var matricula = matriculas.findByUsuarioIdAndCursoId(sessao.id(), aula.cursoId())
			.orElseGet(() -> matriculas.save(Matricula.nova(sessao.id(), aula.cursoId(), agora)));
		String codigo = null;
		if (cursoConcluido) {
			matricula.concluir(agora);
			if (curriculo.certificadoHabilitado()) {
				codigo = emitirCertificado(sessao.id(), curriculo, agora).getCodigo();
			}
		}
		else if (matricula.getConcluidaEm() != null) {
			matricula.reabrir(agora);
		}
		if (codigo == null) {
			codigo = certificados.findByUsuarioIdAndCursoId(sessao.id(), aula.cursoId())
				.map(Certificado::getCodigo)
				.orElse(null);
		}
		return new Conclusao(feitas.size(), aulas.size(), percentual(feitas.size(), aulas.size()), cursoConcluido,
				codigo);
	}

	// --- Anotações ------------------------------------------------------------

	@Transactional(readOnly = true)
	public List<AnotacaoResposta> anotacoes(UsuarioSessao sessao, long aulaId) {
		return anotacoes.findByUsuarioIdAndAulaIdOrderByPosicaoSegundosAscCriadoEmAsc(sessao.id(), aulaId)
			.stream()
			.map(AnotacaoResposta::de)
			.toList();
	}

	public AnotacaoResposta anotar(UsuarioSessao sessao, long aulaId, int posicao, String texto) {
		var aula = aulaComAcesso(sessao, aulaId);
		return AnotacaoResposta.de(anotacoes.save(Anotacao.nova(sessao.id(), aula.id(), posicao, texto, relogio.instant())));
	}

	public AnotacaoResposta editarAnotacao(UsuarioSessao sessao, UUID id, String texto) {
		var anotacao = anotacaoDoUsuario(sessao, id);
		anotacao.editar(texto, relogio.instant());
		return AnotacaoResposta.de(anotacao);
	}

	public void excluirAnotacao(UsuarioSessao sessao, UUID id) {
		anotacoes.delete(anotacaoDoUsuario(sessao, id));
	}

	/** Anotação de outra pessoa responde como inexistente (não revela que existe). */
	private Anotacao anotacaoDoUsuario(UsuarioSessao sessao, UUID id) {
		return anotacoes.findById(id)
			.filter(a -> a.getUsuarioId().equals(sessao.id()))
			.orElseThrow(() -> ErroApi.naoEncontrado("Anotação não encontrada."));
	}

	// --- Meu aprendizado, lista de desejos, certificados ----------------------

	@Transactional(readOnly = true)
	public List<MeuCurso> meusCursos(UsuarioSessao sessao) {
		return cursosDoUsuario(sessao.id());
	}

	/** Cursos em que a pessoa se matriculou, com o progresso (também usado no painel admin). */
	@Transactional(readOnly = true)
	public List<MeuCurso> cursosDoUsuario(UUID usuarioId) {
		var lista = matriculas.findByUsuarioIdOrderByAtualizadaEmDesc(usuarioId);
		var cards = porId(catalogo.cards(lista.stream().map(Matricula::getCursoId).toList()));
		var resultado = new ArrayList<MeuCurso>();
		for (var m : lista) {
			var card = cards.get(m.getCursoId());
			var curriculo = catalogo.curriculo(m.getCursoId());
			if (card != null && curriculo.isPresent()) {
				resultado.add(new MeuCurso(card, resumo(usuarioId, m, curriculo.get())));
			}
		}
		return resultado;
	}

	// --- Painel admin: métricas ------------------------------------------------

	/**
	 * @param ativos7 alunos que mexeram em alguma aula nos últimos 7 dias
	 * @param paradas aulas onde mais gente parou (sem abrir o curso há 14 dias)
	 */
	public record Metricas(long ativos7, long ativos30, List<ConclusaoCurso> conclusao, List<AulaParada> paradas) {
	}

	public record ConclusaoCurso(long cursoId, long matriculas, long concluidas, int taxa) {
	}

	public record AulaParada(long aulaId, long alunos) {
	}

	@Transactional(readOnly = true)
	public Metricas metricas() {
		var agora = relogio.instant();
		var conclusao = matriculas.conclusaoPorCurso()
			.stream()
			.map(l -> {
				long total = ((Number) l[1]).longValue();
				long feitas = ((Number) l[2]).longValue();
				return new ConclusaoCurso((Long) l[0], total, feitas, percentual((int) feitas, (int) total));
			})
			.toList();
		var paradas = matriculas.paradasPorAula(agora.minus(PARADO_HA), PageRequest.of(0, 5))
			.stream()
			.map(l -> new AulaParada((Long) l[0], ((Number) l[1]).longValue()))
			.toList();
		return new Metricas(progressos.alunosAtivosDesde(agora.minus(Duration.ofDays(7))),
				progressos.alunosAtivosDesde(agora.minus(Duration.ofDays(30))), conclusao, paradas);
	}

	@Transactional(readOnly = true)
	public Resumo resumo(UsuarioSessao sessao) {
		var progresso = new LinkedHashMap<Long, Integer>();
		for (var m : matriculas.findByUsuarioIdOrderByAtualizadaEmDesc(sessao.id())) {
			catalogo.curriculo(m.getCursoId())
				.ifPresent(c -> progresso.put(m.getCursoId(), resumo(sessao.id(), m, c).percentual()));
		}
		var ids = desejos.findByUsuarioIdOrderByCriadoEmDesc(sessao.id()).stream().map(ItemListaDesejos::getCursoId).toList();
		return new Resumo(ids, progresso);
	}

	@Transactional(readOnly = true)
	public List<CursoCard> listaDeDesejos(UsuarioSessao sessao) {
		var ids = desejos.findByUsuarioIdOrderByCriadoEmDesc(sessao.id()).stream().map(ItemListaDesejos::getCursoId).toList();
		var cards = porId(catalogo.cards(ids));
		return ids.stream().map(cards::get).filter(c -> c != null).toList();
	}

	public void desejar(UsuarioSessao sessao, String slug, boolean querer) {
		var cursoId = catalogo.idPublicado(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
		var chave = new ItemListaDesejos.Chave(sessao.id(), cursoId);
		if (querer && !desejos.existsById(chave)) {
			desejos.save(new ItemListaDesejos(sessao.id(), cursoId, relogio.instant()));
		}
		else if (!querer) {
			desejos.deleteById(chave);
		}
	}

	@Transactional(readOnly = true)
	public List<CertificadoResposta> meusCertificados(UsuarioSessao sessao) {
		return certificados.findByUsuarioIdOrderByEmitidoEmDesc(sessao.id()).stream().map(this::resposta).toList();
	}

	/** Validação pública: só nome, curso, data e carga horária. */
	@Transactional(readOnly = true)
	public Optional<CertificadoResposta> certificado(String codigo) {
		return certificados.findByCodigo(codigo.toUpperCase()).map(this::resposta);
	}

	// --- Apoio ----------------------------------------------------------------

	private CurriculoDados curriculoPublicado(String slug) {
		return catalogo.curriculo(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
	}

	private AulaDados aulaComAcesso(UsuarioSessao sessao, long aulaId) {
		var aula = catalogo.aula(aulaId).orElseThrow(() -> ErroApi.naoEncontrado("Aula não encontrada."));
		var decisao = decidir(conta(sessao), aula.cursoId(), false, aula.cursoPublicado() && aula.publicada());
		if (!decisao.pode()) {
			throw semAcesso(decisao.motivo());
		}
		return aula;
	}

	private ProgressoAula progresso(UUID usuarioId, long aulaId, Instant agora) {
		return progressos.findById(new ProgressoAula.Chave(usuarioId, aulaId))
			.orElseGet(() -> progressos.save(ProgressoAula.novo(usuarioId, aulaId, agora)));
	}

	private Set<Long> concluidas(UUID usuarioId, List<AulaItem> aulas) {
		if (aulas.isEmpty()) {
			return Set.of();
		}
		return progressos.findByUsuarioIdAndAulaIdIn(usuarioId, aulas.stream().map(AulaItem::id).toList())
			.stream()
			.filter(ProgressoAula::isConcluida)
			.map(ProgressoAula::getAulaId)
			.collect(Collectors.toCollection(HashSet::new));
	}

	private MatriculaResumo resumo(UUID usuarioId, Matricula m, CurriculoDados curriculo) {
		var aulas = curriculo.aulasEmOrdem();
		int feitas = concluidas(usuarioId, aulas).size();
		return new MatriculaResumo(m.getUltimaAulaId(), feitas, aulas.size(), percentual(feitas, aulas.size()),
				m.getConcluidaEm() != null, m.getIniciadaEm(),
				certificados.findByUsuarioIdAndCursoId(usuarioId, m.getCursoId()).map(Certificado::getCodigo).orElse(null));
	}

	private Certificado emitirCertificado(UUID usuarioId, CurriculoDados curriculo, Instant agora) {
		return certificados.findByUsuarioIdAndCursoId(usuarioId, curriculo.cursoId()).orElseGet(() -> {
			var nome = contas.buscar(usuarioId).map(UsuarioResposta::nome).orElse("Aluno PotencIA");
			int minutos = curriculo.cargaHorariaDoCertificado();
			return certificados.save(Certificado.novo(novoCodigo(), usuarioId, curriculo.cursoId(), nome,
					curriculo.titulo(), minutos, agora));
		});
	}

	/** Código curto e legível, sem letras que se confundem (0/O, 1/I): PTC-7K2M-9QXA. */
	private String novoCodigo() {
		String codigo;
		do {
			var sb = new StringBuilder("PTC-");
			for (int i = 0; i < 8; i++) {
				if (i == 4) {
					sb.append('-');
				}
				sb.append(ALFABETO_CODIGO.charAt(ALEATORIO.nextInt(ALFABETO_CODIGO.length())));
			}
			codigo = sb.toString();
		}
		while (certificados.existsByCodigo(codigo));
		return codigo;
	}

	private CertificadoResposta resposta(Certificado c) {
		var slug = catalogo.curriculo(c.getCursoId()).map(CurriculoDados::slug).orElse(null);
		return new CertificadoResposta(c.getCodigo(), c.getNomeAluno(), c.getTituloCurso(), slug,
				c.getCargaHorariaMinutos(), c.getEmitidoEm());
	}

	private Video video(AulaDados aula) {
		if (aula.tipo() != TipoAula.VIDEO) {
			return null;
		}
		var provedor = videos.getIfAvailable();
		if (provedor == null) {
			return null;
		}
		var r = provedor.reproducao(aula.videoId());
		return new Video(r.url(), r.tipo(), r.poster(), aula.legendaUrl());
	}

	private static int indiceDe(List<AulaItem> aulas, long aulaId) {
		for (int i = 0; i < aulas.size(); i++) {
			if (aulas.get(i).id() == aulaId) {
				return i;
			}
		}
		return -1;
	}

	private static int percentual(int feitas, int total) {
		return total == 0 ? 0 : (int) Math.floor(feitas * 100.0 / total);
	}

	private static Map<Long, CursoCard> porId(List<CursoCard> cards) {
		return cards.stream().collect(Collectors.toMap(CursoCard::id, Function.identity()));
	}

	// --- LGPD ------------------------------------------------------------------------

	/** Matrículas, progresso, anotações, lista de desejos e certificados (para "Baixar meus dados"). */
	@Transactional(readOnly = true)
	public Map<String, Object> exportar(UUID usuarioId) {
		var dados = new LinkedHashMap<String, Object>();
		dados.put("matriculas", matriculas.findByUsuarioIdOrderByAtualizadaEmDesc(usuarioId).stream().map(m -> {
			var item = new LinkedHashMap<String, Object>();
			item.put("curso", m.getCursoId());
			item.put("iniciadaEm", m.getIniciadaEm());
			item.put("concluidaEm", m.getConcluidaEm());
			return item;
		}).toList());
		dados.put("progresso", progressos.findByUsuarioId(usuarioId)
			.stream()
			.map(p -> Map.of("aula", p.getAulaId(), "posicaoSegundos", p.getPosicaoSegundos(), "concluida",
					p.isConcluida()))
			.toList());
		dados.put("anotacoes", anotacoes.findByUsuarioIdOrderByCriadoEm(usuarioId)
			.stream()
			.map(a -> Map.of("aula", a.getAulaId(), "posicaoSegundos", a.getPosicaoSegundos(), "texto", a.getTexto(),
					"criadoEm", a.getCriadoEm()))
			.toList());
		dados.put("listaDeDesejos",
				desejos.findByUsuarioIdOrderByCriadoEmDesc(usuarioId).stream().map(ItemListaDesejos::getCursoId).toList());
		dados.put("certificados", certificados.findByUsuarioIdOrderByEmitidoEmDesc(usuarioId)
			.stream()
			.map(c -> Map.of("codigo", c.getCodigo(), "curso", c.getTituloCurso(), "nome", c.getNomeAluno(),
					"cargaHorariaMinutos", c.getCargaHorariaMinutos(), "emitidoEm", c.getEmitidoEm()))
			.toList());
		return dados;
	}

	/** Conta excluída: some tudo o que é do aluno (os certificados deixam de validar). */
	public void excluirDadosDe(UUID usuarioId) {
		anotacoes.deleteAll(anotacoes.findByUsuarioIdOrderByCriadoEm(usuarioId));
		progressos.deleteAll(progressos.findByUsuarioId(usuarioId));
		desejos.deleteAll(desejos.findByUsuarioIdOrderByCriadoEmDesc(usuarioId));
		certificados.deleteAll(certificados.findByUsuarioIdOrderByEmitidoEmDesc(usuarioId));
		matriculas.deleteAll(matriculas.findByUsuarioIdOrderByAtualizadaEmDesc(usuarioId));
	}

}

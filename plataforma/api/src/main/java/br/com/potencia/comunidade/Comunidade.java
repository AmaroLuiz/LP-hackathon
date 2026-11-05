package br.com.potencia.comunidade;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import jakarta.persistence.criteria.Predicate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.aprendizado.AprendizadoService;
import br.com.potencia.catalogo.CatalogoDtos.AulaDados;
import br.com.potencia.catalogo.CatalogoService;
import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.compartilhado.SiteDesatualizado;
import br.com.potencia.contas.ContaService;
import br.com.potencia.contas.ContasAdmin;
import br.com.potencia.contas.UsuarioSessao;
import br.com.potencia.email.EnviadorEmail;
import br.com.potencia.email.EnviadorEmail.Email;

/**
 * Perguntas por aula (com respostas de alunos e da "Equipe PotencIA") e
 * avaliações dos cursos. Só pergunta quem pode ver a aula; só avalia quem
 * concluiu pelo menos 30% do curso. A moderação esconde sem apagar.
 */
@Service
@Transactional
public class Comunidade {

	static final int MINIMO_PARA_AVALIAR = 30;

	/** Por pessoa, em uma hora: evita spam sem atrapalhar quem está estudando. */
	static final int LIMITE_POR_HORA = 15;

	public record Autoria(String nome, boolean equipe, boolean voce) {
	}

	public record RespostaItem(UUID id, String texto, Autoria autor, Instant criadoEm) {
	}

	public record PerguntaItem(UUID id, String titulo, String texto, Autoria autor, Instant criadoEm, int uteis,
			boolean marcadaPorVoce, boolean respondidaPelaEquipe, List<RespostaItem> respostas) {
	}

	public record AvaliacaoItem(UUID id, String nome, int nota, String comentario, String respostaEquipe,
			Instant criadoEm) {
	}

	public record Avaliacoes(BigDecimal media, long total, Map<Integer, Long> distribuicao, List<AvaliacaoItem> itens,
			int pagina, long totalFiltrado) {
	}

	public record MinhaAvaliacao(boolean podeAvaliar, int percentual, int minimo, Integer nota, String comentario,
			String respostaEquipe) {
	}

	public record Depoimento(String nome, int nota, String comentario, String curso, String cursoSlug) {
	}

	// --- Painel ------------------------------------------------------------------

	public record PerguntaAdmin(UUID id, String titulo, String texto, String autor, String email, String curso,
			String aula, long aulaId, boolean oculta, boolean respondidaPelaEquipe, Instant criadoEm,
			List<RespostaAdmin> respostas) {
	}

	public record RespostaAdmin(UUID id, String texto, String autor, boolean daEquipe, boolean oculta,
			Instant criadoEm) {
	}

	public record AvaliacaoAdmin(UUID id, String autor, String email, String curso, int nota, String comentario,
			String status, String respostaEquipe, Instant criadoEm) {
	}

	private final PerguntaRepository perguntas;

	private final RespostaRepository respostas;

	private final PerguntaUtilRepository uteis;

	private final AvaliacaoRepository avaliacoes;

	private final AprendizadoService aprendizado;

	private final CatalogoService catalogo;

	private final ContasAdmin contasAdmin;

	private final ContaService contas;

	private final EnviadorEmail email;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	private final String webUrl;

	private final Map<UUID, Deque<Instant>> envios = new ConcurrentHashMap<>();

	Comunidade(PerguntaRepository perguntas, RespostaRepository respostas, PerguntaUtilRepository uteis,
			AvaliacaoRepository avaliacoes, AprendizadoService aprendizado, CatalogoService catalogo,
			ContasAdmin contasAdmin, ContaService contas, EnviadorEmail email, ApplicationEventPublisher eventos,
			Clock relogio, @Value("${potencia.web-url}") String webUrl) {
		this.perguntas = perguntas;
		this.respostas = respostas;
		this.uteis = uteis;
		this.avaliacoes = avaliacoes;
		this.aprendizado = aprendizado;
		this.catalogo = catalogo;
		this.contasAdmin = contasAdmin;
		this.contas = contas;
		this.email = email;
		this.eventos = eventos;
		this.relogio = relogio;
		this.webUrl = webUrl;
	}

	// --- Perguntas -----------------------------------------------------------------

	@Transactional(readOnly = true)
	public List<PerguntaItem> perguntasDaAula(UsuarioSessao eu, long aulaId) {
		exigirAcesso(eu, aulaId);
		var lista = perguntas.findByAulaIdAndOcultaFalseOrderByCriadoEmDesc(aulaId);
		var ids = lista.stream().map(Pergunta::getId).toList();
		var todas = respostas.findByPerguntaIdInOrderByCriadoEm(ids).stream().filter(r -> !r.isOculta()).toList();
		var marcacoes = uteis.findByPerguntaIdIn(ids);
		var pessoas = new HashSet<UUID>();
		lista.forEach(p -> pessoas.add(p.getUsuarioId()));
		todas.forEach(r -> pessoas.add(r.getUsuarioId()));
		var nomes = contasAdmin.pessoas(pessoas);
		var porPergunta = todas.stream().collect(Collectors.groupingBy(Resposta::getPerguntaId));
		var contagem = marcacoes.stream().collect(Collectors.groupingBy(PerguntaUtil::getPerguntaId, Collectors.counting()));
		var minhas = uteis.findByUsuarioId(eu.id()).stream().map(PerguntaUtil::getPerguntaId).collect(Collectors.toSet());
		return lista.stream().map(p -> {
			var rs = porPergunta.getOrDefault(p.getId(), List.of());
			return new PerguntaItem(p.getId(), p.getTitulo(), p.getTexto(),
					autoria(p.getUsuarioId(), false, eu, nomes), p.getCriadoEm(),
					contagem.getOrDefault(p.getId(), 0L).intValue(), minhas.contains(p.getId()),
					rs.stream().anyMatch(Resposta::isDaEquipe),
					rs.stream()
						.map(r -> new RespostaItem(r.getId(), r.getTexto(),
								autoria(r.getUsuarioId(), r.isDaEquipe(), eu, nomes), r.getCriadoEm()))
						.toList());
		}).toList();
	}

	public PerguntaItem perguntar(UsuarioSessao eu, long aulaId, String titulo, String texto) {
		var aula = exigirAcesso(eu, aulaId);
		limitar(eu.id());
		var p = perguntas.save(Pergunta.nova(aulaId, aula.cursoId(), eu.id(), titulo, texto, agora()));
		return new PerguntaItem(p.getId(), p.getTitulo(), p.getTexto(), new Autoria(nome(eu.nome()), false, true),
				p.getCriadoEm(), 0, false, false, List.of());
	}

	public RespostaItem responder(UsuarioSessao eu, UUID perguntaId, String texto) {
		var p = pergunta(perguntaId);
		exigirAcesso(eu, p.getAulaId());
		limitar(eu.id());
		var r = respostas.save(Resposta.nova(perguntaId, eu.id(), false, texto, agora()));
		p.tocar(agora());
		avisarQuemPerguntou(p, eu.id(), false);
		return new RespostaItem(r.getId(), r.getTexto(), new Autoria(nome(eu.nome()), false, true), r.getCriadoEm());
	}

	/** "Também tenho essa dúvida": liga e desliga. */
	public int marcarUtil(UsuarioSessao eu, UUID perguntaId, boolean util) {
		var p = pergunta(perguntaId);
		exigirAcesso(eu, p.getAulaId());
		var chave = new PerguntaUtil.Chave(perguntaId, eu.id());
		if (util && !uteis.existsById(chave)) {
			uteis.save(new PerguntaUtil(perguntaId, eu.id()));
		}
		else if (!util) {
			uteis.deleteById(chave);
		}
		uteis.flush();
		return uteis.findByPerguntaIdIn(List.of(perguntaId)).size();
	}

	/** Quem perguntou pode apagar a própria pergunta (some para todos, fica para a moderação). */
	public void apagarPergunta(UsuarioSessao eu, UUID perguntaId) {
		var p = pergunta(perguntaId);
		if (!p.getUsuarioId().equals(eu.id())) {
			throw ErroApi.naoEncontrado("Pergunta não encontrada.");
		}
		p.ocultar(true, agora());
	}

	// --- Avaliações ----------------------------------------------------------------

	@Transactional(readOnly = true)
	public Avaliacoes avaliacoesDoCurso(String slug, Integer nota, Integer pagina) {
		long cursoId = catalogo.idPublicado(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
		var distribuicao = distribuicao(cursoId);
		long total = distribuicao.values().stream().mapToLong(Long::longValue).sum();
		var pedido = Pagina.pedido(pagina, 10, Sort.unsorted());
		var pagina1 = nota == null
				? avaliacoes.findByCursoIdAndStatusOrderByCriadoEmDesc(cursoId, Avaliacao.Status.PUBLICADA, pedido)
				: avaliacoes.findByCursoIdAndStatusAndNotaOrderByCriadoEmDesc(cursoId, Avaliacao.Status.PUBLICADA, nota,
						pedido);
		var nomes = contasAdmin.pessoas(pagina1.getContent().stream().map(Avaliacao::getUsuarioId).toList());
		return new Avaliacoes(media(distribuicao, total), total, distribuicao,
				pagina1.getContent()
					.stream()
					.map(a -> new AvaliacaoItem(a.getId(), nomes.containsKey(a.getUsuarioId()) ? nome(nomes.get(a.getUsuarioId()).nome()) : "Aluno",
							a.getNota(), a.getComentario(), a.getRespostaEquipe(), a.getCriadoEm()))
					.toList(),
				pagina1.getNumber() + 1, pagina1.getTotalElements());
	}

	@Transactional(readOnly = true)
	public MinhaAvaliacao minhaAvaliacao(UsuarioSessao eu, String slug) {
		long cursoId = catalogo.idPublicado(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
		int percentual = aprendizado.percentualConcluido(eu.id(), cursoId);
		var minha = avaliacoes.findByUsuarioIdAndCursoId(eu.id(), cursoId);
		return new MinhaAvaliacao(percentual >= MINIMO_PARA_AVALIAR, percentual, MINIMO_PARA_AVALIAR,
				minha.map(Avaliacao::getNota).orElse(null), minha.map(Avaliacao::getComentario).orElse(null),
				minha.map(Avaliacao::getRespostaEquipe).orElse(null));
	}

	public MinhaAvaliacao avaliar(UsuarioSessao eu, String slug, int nota, String comentario) {
		long cursoId = catalogo.idPublicado(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
		int percentual = aprendizado.percentualConcluido(eu.id(), cursoId);
		if (percentual < MINIMO_PARA_AVALIAR) {
			throw ErroApi.proibido("AVALIACAO_CEDO",
					"Para avaliar, conclua pelo menos " + MINIMO_PARA_AVALIAR + "% do curso. Você está em " + percentual + "%.");
		}
		limitar(eu.id());
		var a = avaliacoes.findByUsuarioIdAndCursoId(eu.id(), cursoId)
			.orElseGet(() -> avaliacoes.save(Avaliacao.nova(eu.id(), cursoId, agora())));
		a.editar(nota, comentario, agora());
		avaliacoes.flush();
		recalcular(cursoId);
		return minhaAvaliacao(eu, slug);
	}

	public void apagarAvaliacao(UsuarioSessao eu, String slug) {
		long cursoId = catalogo.idPublicado(slug).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
		avaliacoes.findByUsuarioIdAndCursoId(eu.id(), cursoId).ifPresent(a -> {
			avaliacoes.delete(a);
			avaliacoes.flush();
			recalcular(cursoId);
		});
	}

	/** Avaliações boas e com comentário, para a home (só o que é real). */
	@Transactional(readOnly = true)
	public List<Depoimento> depoimentos() {
		var lista = avaliacoes.findTop6ByStatusAndNotaGreaterThanEqualAndComentarioIsNotNullOrderByCriadoEmDesc(
				Avaliacao.Status.PUBLICADA, 4);
		var nomes = contasAdmin.pessoas(lista.stream().map(Avaliacao::getUsuarioId).toList());
		var cursos = new HashMap<Long, String[]>();
		catalogo.listarPublicados().forEach(c -> cursos.put(c.id(), new String[] { c.titulo(), c.slug() }));
		return lista.stream()
			.filter(a -> cursos.containsKey(a.getCursoId()))
			.map(a -> new Depoimento(nomes.containsKey(a.getUsuarioId()) ? nome(nomes.get(a.getUsuarioId()).nome()) : "Aluno",
					a.getNota(), a.getComentario(), cursos.get(a.getCursoId())[0], cursos.get(a.getCursoId())[1]))
			.toList();
	}

	// --- Moderação (painel) ----------------------------------------------------------

	@Transactional(readOnly = true)
	public Pagina<PerguntaAdmin> perguntasParaModerar(String filtro, Integer pagina) {
		Specification<Pergunta> spec = (raiz, consulta, cb) -> {
			var condicoes = new ArrayList<Predicate>();
			if ("ocultas".equals(filtro)) {
				condicoes.add(cb.isTrue(raiz.get("oculta")));
			}
			else if (!"todas".equals(filtro)) {
				condicoes.add(cb.isFalse(raiz.get("oculta")));
			}
			return cb.and(condicoes.toArray(Predicate[]::new));
		};
		var todas = perguntas.findAll(spec, Sort.by(Sort.Direction.DESC, "criadoEm"));
		var ids = todas.stream().map(Pergunta::getId).toList();
		var rs = respostas.findByPerguntaIdInOrderByCriadoEm(ids)
			.stream()
			.collect(Collectors.groupingBy(Resposta::getPerguntaId));
		// "Sem resposta": a fila padrão mostra o que a equipe ainda não respondeu.
		var filtradas = "sem-resposta".equals(filtro) || filtro == null || filtro.isBlank()
				? todas.stream().filter(p -> rs.getOrDefault(p.getId(), List.of()).stream().noneMatch(r -> r.isDaEquipe() && !r.isOculta())).toList()
				: todas;
		var pedido = Pagina.pedido(pagina, 20, Sort.unsorted());
		int de = (int) Math.min(pedido.getOffset(), filtradas.size());
		int ate = Math.min(de + pedido.getPageSize(), filtradas.size());
		var trecho = filtradas.subList(de, ate);
		var pessoas = new HashSet<UUID>();
		trecho.forEach(p -> pessoas.add(p.getUsuarioId()));
		trecho.forEach(p -> rs.getOrDefault(p.getId(), List.of()).forEach(r -> pessoas.add(r.getUsuarioId())));
		var nomes = contasAdmin.pessoas(pessoas);
		var itens = trecho.stream().map(p -> {
			var aula = catalogo.aula(p.getAulaId()).orElse(null);
			var lista = rs.getOrDefault(p.getId(), List.of());
			var autor = nomes.get(p.getUsuarioId());
			return new PerguntaAdmin(p.getId(), p.getTitulo(), p.getTexto(), autor == null ? "Conta excluída" : autor.nome(),
					autor == null ? null : autor.email(), aula == null ? "" : aula.cursoTitulo(),
					aula == null ? "" : aula.titulo(), p.getAulaId(), p.isOculta(),
					lista.stream().anyMatch(r -> r.isDaEquipe() && !r.isOculta()), p.getCriadoEm(),
					lista.stream()
						.map(r -> new RespostaAdmin(r.getId(), r.getTexto(),
								r.isDaEquipe() ? "Equipe PotencIA" : nomes.containsKey(r.getUsuarioId()) ? nomes.get(r.getUsuarioId()).nome() : "Conta excluída",
								r.isDaEquipe(), r.isOculta(), r.getCriadoEm()))
						.toList());
		}).toList();
		return new Pagina<>(itens, pedido.getPageNumber() + 1, pedido.getPageSize(), filtradas.size());
	}

	public void responderComoEquipe(Autor admin, UUID perguntaId, String texto) {
		var p = pergunta(perguntaId);
		respostas.save(Resposta.nova(perguntaId, admin.id(), true, texto, agora()));
		p.tocar(agora());
		avisarQuemPerguntou(p, admin.id(), true);
		eventos.publishEvent(EventoAuditoria.de(admin, "pergunta.respondida", "pergunta", perguntaId,
				"Respondeu como Equipe PotencIA: \"" + cortar(p.getTitulo(), 80) + "\""));
	}

	public void ocultarPergunta(Autor admin, UUID perguntaId, boolean oculta) {
		var p = pergunta(perguntaId);
		p.ocultar(oculta, agora());
		eventos.publishEvent(EventoAuditoria.de(admin, oculta ? "pergunta.ocultada" : "pergunta.republicada", "pergunta",
				perguntaId, (oculta ? "Escondeu" : "Republicou") + " a pergunta \"" + cortar(p.getTitulo(), 80) + "\""));
	}

	public void ocultarResposta(Autor admin, UUID respostaId, boolean oculta) {
		var r = respostas.findById(respostaId).orElseThrow(() -> ErroApi.naoEncontrado("Resposta não encontrada."));
		r.ocultar(oculta);
		eventos.publishEvent(EventoAuditoria.de(admin, oculta ? "resposta.ocultada" : "resposta.republicada", "pergunta",
				r.getPerguntaId(), (oculta ? "Escondeu" : "Republicou") + " uma resposta"));
	}

	@Transactional(readOnly = true)
	public Pagina<AvaliacaoAdmin> avaliacoesParaModerar(String status, Integer nota, Integer pagina) {
		Specification<Avaliacao> spec = (raiz, consulta, cb) -> {
			var condicoes = new ArrayList<Predicate>();
			if ("OCULTA".equals(status) || "PUBLICADA".equals(status)) {
				condicoes.add(cb.equal(raiz.get("status"), Avaliacao.Status.valueOf(status)));
			}
			if ("sem-resposta".equals(status)) {
				condicoes.add(cb.isNull(raiz.get("respostaEquipe")));
				condicoes.add(cb.equal(raiz.get("status"), Avaliacao.Status.PUBLICADA));
			}
			if (nota != null) {
				condicoes.add(cb.equal(raiz.get("nota"), nota));
			}
			return cb.and(condicoes.toArray(Predicate[]::new));
		};
		var resultado = avaliacoes.findAll(spec, Pagina.pedido(pagina, 20, Sort.by(Sort.Direction.DESC, "criadoEm")));
		var nomes = contasAdmin.pessoas(resultado.getContent().stream().map(Avaliacao::getUsuarioId).toList());
		var cursos = new HashMap<Long, String>();
		catalogo.listarParaAdmin().forEach(c -> cursos.put(c.id(), c.titulo()));
		return Pagina.de(resultado, a -> {
			var autor = nomes.get(a.getUsuarioId());
			return new AvaliacaoAdmin(a.getId(), autor == null ? "Conta excluída" : autor.nome(),
					autor == null ? null : autor.email(), cursos.getOrDefault(a.getCursoId(), ""), a.getNota(),
					a.getComentario(), a.getStatus().name(), a.getRespostaEquipe(), a.getCriadoEm());
		});
	}

	public void moderarAvaliacao(Autor admin, UUID id, boolean oculta) {
		var a = avaliacoes.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Avaliação não encontrada."));
		a.moderar(oculta ? Avaliacao.Status.OCULTA : Avaliacao.Status.PUBLICADA, agora());
		avaliacoes.flush();
		recalcular(a.getCursoId());
		eventos.publishEvent(EventoAuditoria.de(admin, oculta ? "avaliacao.ocultada" : "avaliacao.republicada",
				"avaliacao", id, (oculta ? "Escondeu" : "Republicou") + " uma avaliação de " + a.getNota() + " estrela(s)"));
	}

	public void responderAvaliacao(Autor admin, UUID id, String texto) {
		var a = avaliacoes.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Avaliação não encontrada."));
		a.responder(texto, agora());
		eventos.publishEvent(EventoAuditoria.de(admin, "avaliacao.respondida", "avaliacao", id, "Respondeu uma avaliação"));
		catalogo.curriculo(a.getCursoId()).ifPresent(c -> eventos.publishEvent(SiteDesatualizado.catalogo(c.slug())));
	}

	// --- LGPD ------------------------------------------------------------------------

	/** Tudo o que a pessoa escreveu aqui (para "Baixar meus dados"). */
	@Transactional(readOnly = true)
	public Map<String, Object> exportar(UUID usuarioId) {
		var dados = new LinkedHashMap<String, Object>();
		dados.put("perguntas", perguntas.findByUsuarioId(usuarioId)
			.stream()
			.map(p -> Map.of("aula", p.getAulaId(), "titulo", p.getTitulo(), "texto", p.getTexto(), "criadoEm",
					p.getCriadoEm().toString()))
			.toList());
		dados.put("respostas", respostas.findByUsuarioId(usuarioId)
			.stream()
			.map(r -> Map.of("pergunta", r.getPerguntaId().toString(), "texto", r.getTexto(), "criadoEm",
					r.getCriadoEm().toString()))
			.toList());
		dados.put("avaliacoes", avaliacoes.findByUsuarioId(usuarioId).stream().map(a -> {
			var m = new LinkedHashMap<String, Object>();
			m.put("curso", a.getCursoId());
			m.put("nota", a.getNota());
			m.put("comentario", a.getComentario());
			m.put("criadoEm", a.getCriadoEm().toString());
			return m;
		}).toList());
		return dados;
	}

	/**
	 * Conta excluída: avaliações e marcações saem; perguntas e respostas ficam
	 * escondidas (o texto pode ter dado pessoal, e a conversa dos outros não quebra).
	 */
	public void excluirDadosDe(UUID usuarioId) {
		var agora = agora();
		var cursosAfetados = new HashSet<Long>();
		for (var a : avaliacoes.findByUsuarioId(usuarioId)) {
			cursosAfetados.add(a.getCursoId());
			avaliacoes.delete(a);
		}
		uteis.deleteAll(uteis.findByUsuarioId(usuarioId));
		perguntas.findByUsuarioId(usuarioId).forEach(p -> p.ocultar(true, agora));
		respostas.findByUsuarioId(usuarioId).forEach(r -> r.ocultar(true));
		avaliacoes.flush();
		cursosAfetados.forEach(this::recalcular);
	}

	// -------------------------------------------------------------------------

	private void recalcular(long cursoId) {
		var d = distribuicao(cursoId);
		long total = d.values().stream().mapToLong(Long::longValue).sum();
		catalogo.registrarAvaliacoes(cursoId, media(d, total), (int) total);
	}

	private Map<Integer, Long> distribuicao(long cursoId) {
		var d = new LinkedHashMap<Integer, Long>();
		for (int n = 5; n >= 1; n--) {
			d.put(n, 0L);
		}
		for (var linha : avaliacoes.distribuicao(cursoId, Avaliacao.Status.PUBLICADA)) {
			d.put(((Number) linha[0]).intValue(), ((Number) linha[1]).longValue());
		}
		return d;
	}

	private static BigDecimal media(Map<Integer, Long> d, long total) {
		if (total == 0) {
			return BigDecimal.ZERO.setScale(2);
		}
		long soma = d.entrySet().stream().mapToLong(e -> e.getKey() * e.getValue()).sum();
		return BigDecimal.valueOf(soma).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
	}

	private AulaDados exigirAcesso(UsuarioSessao eu, long aulaId) {
		var aula = catalogo.aula(aulaId).orElseThrow(() -> ErroApi.naoEncontrado("Aula não encontrada."));
		if (!aprendizado.podeVerAula(eu, aulaId)) {
			throw ErroApi.proibido("SEM_ACESSO", "As perguntas desta aula são de quem tem acesso ao curso.");
		}
		return aula;
	}

	private Pergunta pergunta(UUID id) {
		return perguntas.findById(id).filter(p -> !p.isOculta())
			.orElseThrow(() -> ErroApi.naoEncontrado("Pergunta não encontrada."));
	}

	private void avisarQuemPerguntou(Pergunta p, UUID quemRespondeu, boolean equipe) {
		if (p.getUsuarioId().equals(quemRespondeu)) {
			return;
		}
		var curso = catalogo.aula(p.getAulaId()).orElse(null);
		contas.buscar(p.getUsuarioId()).ifPresent(u -> {
			try {
				email.enviar(new Email(u.email(), "Responderam sua pergunta na PotencIA", """
						Olá, %s.

						%s respondeu a sua pergunta "%s".

						Veja a resposta na aula:
						%s/aprender/%s/%d
						""".formatted(u.nome(), equipe ? "A Equipe PotencIA" : "Outro aluno", cortar(p.getTitulo(), 120),
						webUrl, curso == null ? "" : curso.cursoSlug(), p.getAulaId())));
			}
			catch (RuntimeException e) {
				// O aviso é um extra: a resposta já está salva.
			}
		});
	}

	private void limitar(UUID usuarioId) {
		var agora = agora();
		var fila = envios.computeIfAbsent(usuarioId, k -> new ArrayDeque<>());
		synchronized (fila) {
			while (!fila.isEmpty() && fila.peekFirst().isBefore(agora.minus(Duration.ofHours(1)))) {
				fila.pollFirst();
			}
			if (fila.size() >= LIMITE_POR_HORA) {
				throw ErroApi.muitasTentativas(Duration.between(agora, fila.peekFirst().plus(Duration.ofHours(1))).toSeconds());
			}
			fila.addLast(agora);
		}
	}

	private static Autoria autoria(UUID usuarioId, boolean equipe, UsuarioSessao eu, Map<UUID, ContasAdmin.Pessoa> nomes) {
		if (equipe) {
			return new Autoria("Equipe PotencIA", true, false);
		}
		var p = nomes.get(usuarioId);
		return new Autoria(p == null ? "Conta excluída" : nome(p.nome()), false, usuarioId.equals(eu.id()));
	}

	/** "Marta Confeiteira" → "Marta C." (o nome completo não fica exposto para os outros alunos). */
	static String nome(String completo) {
		var partes = completo == null ? new String[0] : completo.strip().split("\\s+");
		if (partes.length == 0 || partes[0].isEmpty()) {
			return "Aluno";
		}
		return partes.length == 1 ? partes[0] : partes[0] + " " + partes[partes.length - 1].charAt(0) + ".";
	}

	private static String cortar(String s, int max) {
		return s.length() <= max ? s : s.substring(0, max - 1) + "…";
	}

	private Instant agora() {
		return relogio.instant();
	}

}

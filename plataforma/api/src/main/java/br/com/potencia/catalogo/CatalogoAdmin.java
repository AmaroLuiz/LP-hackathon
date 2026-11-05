package br.com.potencia.catalogo;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.assinaturas.AssinaturasService.PlanoDoCurso;
import br.com.potencia.catalogo.CatalogoAdminDtos.AulaPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.CategoriaAdmin;
import br.com.potencia.catalogo.CatalogoAdminDtos.CategoriaPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.Checklist;
import br.com.potencia.catalogo.CatalogoAdminDtos.CursoEdicao;
import br.com.potencia.catalogo.CatalogoAdminDtos.CursoPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.InstrutorAdmin;
import br.com.potencia.catalogo.CatalogoAdminDtos.InstrutorPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.ItemChecklist;
import br.com.potencia.catalogo.CatalogoAdminDtos.MaterialPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.ModuloPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.NovoCursoPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.OrdemPedido;
import br.com.potencia.catalogo.CatalogoDtos.CursoDetalhe;
import br.com.potencia.catalogo.CatalogoDtos.Totais;
import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.SiteDesatualizado;

/**
 * Escrita do catálogo pelo painel admin: cursos, currículo, categorias e
 * instrutores. Toda alteração vai para a auditoria; o que muda a vitrine avisa
 * o site para refazer as páginas em cache.
 */
@Service
@Transactional
class CatalogoAdmin {

	/** Capas: as iniciais (public/capas do site) ou enviadas pelo painel. */
	private static final Pattern CAPA = Pattern.compile("^/(capas/[a-z0-9-]+\\.webp|api/arquivos/publico/capas/[0-9a-f-]{36}\\.(webp|jpg|png))$");

	private static final Pattern FOTO = Pattern.compile("^/api/arquivos/publico/fotos/[0-9a-f-]{36}\\.(webp|jpg|png)$");

	private static final Pattern LEGENDA = Pattern.compile("^/api/arquivos/publico/legendas/[0-9a-f-]{36}\\.vtt$");

	private static final Pattern MATERIAL = Pattern
		.compile("^privado/materiais/[0-9a-f-]{36}\\.(pdf|zip|docx|xlsx|pptx|png|jpg|webp)$");

	/** Vídeo enviado no local ("local:privado/videos/...") ou id do provedor. */
	private static final Pattern VIDEO = Pattern
		.compile("^(local:privado/videos/[0-9a-f-]{36}\\.(mp4|mov|webm)|[A-Za-z0-9_-]{1,120})$");

	static final int MIN_APRENDIZADOS = 4;

	private final CursoRepository cursos;

	private final CategoriaRepository categorias;

	private final InstrutorRepository instrutores;

	private final ModuloRepository modulos;

	private final AulaRepository aulas;

	private final MaterialRepository materiais;

	private final AssinaturasService assinaturas;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	CatalogoAdmin(CursoRepository cursos, CategoriaRepository categorias, InstrutorRepository instrutores,
			ModuloRepository modulos, AulaRepository aulas, MaterialRepository materiais, AssinaturasService assinaturas,
			ApplicationEventPublisher eventos, Clock relogio) {
		this.cursos = cursos;
		this.categorias = categorias;
		this.instrutores = instrutores;
		this.modulos = modulos;
		this.aulas = aulas;
		this.materiais = materiais;
		this.assinaturas = assinaturas;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	// --- Cursos ---------------------------------------------------------------

	@Transactional(readOnly = true)
	CursoEdicao buscar(long id) {
		return CursoEdicao.de(curso(id));
	}

	CursoEdicao criar(NovoCursoPedido pedido, Autor autor) {
		var categoria = pedido.categoriaId() != null ? categoria(pedido.categoriaId())
				: categorias.findAllByOrderByOrdem()
					.stream()
					.findFirst()
					.orElseThrow(() -> ErroApi.invalido("Cadastre um tema antes de criar cursos."));
		var titulo = pedido.titulo().strip();
		var curso = cursos.save(Curso.novo(slugLivre(slugDe(titulo), null), cursos.maiorNumero() + 1, titulo, categoria,
				List.of(), agora()));
		auditar(EventoAuditoria.de(autor, "curso.criado", "curso", curso.getId(), "Criou o curso \"" + titulo + "\""));
		return CursoEdicao.de(curso);
	}

	CursoEdicao editar(long id, CursoPedido p, Autor autor) {
		var curso = curso(id);
		var antes = retrato(curso);
		var slugAntigo = curso.getSlug();
		if (!p.slug().equals(curso.getSlug()) && cursos.existsBySlug(p.slug())) {
			throw ErroApi.conflito("slug", "Já existe um curso com este endereço.");
		}
		if (p.numero() != curso.getNumero() && cursos.existsByNumero(p.numero())) {
			throw ErroApi.conflito("numero", "Já existe um curso com este número.");
		}
		var capa = vazioParaNulo(p.capaUrl());
		if (capa != null && !CAPA.matcher(capa).matches()) {
			throw ErroApi.invalido("capaUrl", "Envie a capa pelo painel.");
		}
		var ids = p.instrutores() == null ? List.<Long>of() : p.instrutores().stream().distinct().toList();
		var escolhidos = instrutores.findAllById(ids);
		if (escolhidos.size() != ids.size()) {
			throw ErroApi.invalido("instrutores", "Instrutor não encontrado.");
		}
		var porId = new HashMap<Long, Instrutor>();
		escolhidos.forEach(i -> porId.put(i.getId(), i));
		curso.editar(new Curso.Alteracao(p.slug(), p.numero(), p.titulo().strip(), texto(p.subtitulo()),
				vazioParaNulo(p.descricao()), capa, vazioParaNulo(p.capaAlt()), p.nivel(), p.idioma().strip(),
				lista(p.ferramentas()), lista(p.oQueAprende()), lista(p.requisitos()), lista(p.paraQuemE()),
				texto(p.resultadoFinal()), Boolean.TRUE.equals(p.destaque()),
				!Boolean.FALSE.equals(p.certificadoHabilitado()), p.cargaHorariaMinutos(), vazioParaNulo(p.seoTitulo()),
				vazioParaNulo(p.seoDescricao())), categoria(p.categoriaId()), ids.stream().map(porId::get).toList(),
				agora());
		try {
			cursos.saveAndFlush(curso);
		}
		catch (DataIntegrityViolationException e) {
			throw ErroApi.conflito("slug", "Endereço ou número já usado por outro curso.");
		}
		auditar(EventoAuditoria.alteracao(autor, "curso.editado", "curso", id, "Editou \"" + curso.getTitulo() + "\"",
				antes, retrato(curso)));
		vitrineMudou(curso, slugAntigo);
		return CursoEdicao.de(curso);
	}

	@Transactional(readOnly = true)
	Checklist checklist(long id) {
		var c = curso(id);
		var itens = new ArrayList<ItemChecklist>();
		var publicadas = c.getModulos().stream().flatMap(m -> m.getAulas().stream()).filter(Aula::isPublicada).toList();
		itens.add(new ItemChecklist("titulo", "Título e subtítulo", preenchido(c.getTitulo()) && preenchido(c.getSubtitulo()), true));
		itens.add(new ItemChecklist("capa", "Capa enviada", preenchido(c.getCapaUrl()), true));
		itens.add(new ItemChecklist("capaAlt", "Texto alternativo da capa", preenchido(c.getCapaAlt()), true));
		itens.add(new ItemChecklist("descricao", "Descrição do curso", preenchido(c.getDescricao()), true));
		itens.add(new ItemChecklist("oQueAprende", "Pelo menos " + MIN_APRENDIZADOS + " itens em \"O que você vai aprender\"",
				c.getOQueAprende().size() >= MIN_APRENDIZADOS, true));
		itens.add(new ItemChecklist("resultado", "\"Ao final você terá\" preenchido", preenchido(c.getResultadoFinal()), true));
		itens.add(new ItemChecklist("instrutor", "Pelo menos um instrutor", !c.getInstrutores().isEmpty(), true));
		itens.add(new ItemChecklist("curriculo", "Pelo menos um módulo com uma aula publicada", !publicadas.isEmpty(), true));
		itens.add(new ItemChecklist("plano", "Incluído em pelo menos um plano",
				assinaturas.planosDoCurso(id).stream().anyMatch(PlanoDoCurso::incluido), true));
		itens.add(new ItemChecklist("videos", "Toda aula de vídeo publicada tem vídeo",
				publicadas.stream().filter(a -> a.getTipo() == TipoAula.VIDEO).allMatch(a -> preenchido(a.getVideoId())),
				false));
		itens.add(new ItemChecklist("duracao", "Toda aula publicada tem duração",
				publicadas.stream().allMatch(a -> a.getDuracaoSegundos() != null && a.getDuracaoSegundos() > 0), false));
		itens.add(new ItemChecklist("previa", "Pelo menos uma aula de prévia gratuita",
				publicadas.stream().anyMatch(Aula::isPrevia), false));
		boolean pode = itens.stream().allMatch(i -> i.ok() || !i.obrigatorio());
		return new Checklist(pode, itens);
	}

	CursoEdicao publicar(long id, Autor autor) {
		var lista = checklist(id);
		if (!lista.podePublicar()) {
			var faltam = lista.itens().stream().filter(i -> i.obrigatorio() && !i.ok()).map(ItemChecklist::texto).toList();
			throw ErroApi.conflito(null, "Ainda falta: " + String.join("; ", faltam) + ".");
		}
		var curso = curso(id);
		var antes = curso.getStatus();
		curso.publicar(agora());
		mudouStatus(curso, antes, "curso.publicado", "Publicou", autor);
		return CursoEdicao.de(curso);
	}

	CursoEdicao despublicar(long id, Autor autor) {
		var curso = curso(id);
		var antes = curso.getStatus();
		curso.despublicar(agora());
		mudouStatus(curso, antes, "curso.despublicado", "Despublicou", autor);
		return CursoEdicao.de(curso);
	}

	CursoEdicao arquivar(long id, Autor autor) {
		var curso = curso(id);
		var antes = curso.getStatus();
		curso.arquivar(agora());
		mudouStatus(curso, antes, "curso.arquivado", "Arquivou", autor);
		return CursoEdicao.de(curso);
	}

	CursoEdicao duplicar(long id, Autor autor) {
		var original = curso(id);
		var titulo = cortar(original.getTitulo() + " (cópia)", 160);
		var copia = cursos.save(original.duplicar(slugLivre(original.getSlug() + "-copia", null),
				cursos.maiorNumero() + 1, titulo, agora()));
		for (var m : original.getModulos()) {
			var novo = modulos.save(Modulo.novo(copia, m.getOrdem(), m.getTitulo(), m.getDescricao()));
			copia.getModulos().add(novo);
			for (var a : m.getAulas()) {
				var aula = aulas.save(Aula.nova(novo, a.getOrdem(), a.alteracao()));
				novo.getAulas().add(aula);
				for (var mat : a.getMateriais()) {
					aula.getMateriais()
						.add(materiais.save(Material.novo(aula, mat.getOrdem(), mat.getNome(), mat.getChave(),
								mat.getTamanhoBytes(), mat.getTipoMime())));
				}
			}
		}
		auditar(EventoAuditoria.de(autor, "curso.duplicado", "curso", copia.getId(),
				"Duplicou \"" + original.getTitulo() + "\""));
		return CursoEdicao.de(copia);
	}

	/** O curso como o aluno vai ver, em qualquer status (pré-visualização do painel). */
	@Transactional(readOnly = true)
	CursoDetalhe previa(long id) {
		var c = curso(id);
		var publicadas = c.getModulos().stream().flatMap(m -> m.getAulas().stream()).filter(Aula::isPublicada).toList();
		var totais = new Totais(publicadas.size(),
				publicadas.stream().mapToLong(a -> a.getDuracaoSegundos() == null ? 0 : a.getDuracaoSegundos()).sum(),
				publicadas.stream().anyMatch(Aula::isPrevia));
		return CursoDetalhe.de(c, totais);
	}

	@Transactional(readOnly = true)
	List<PlanoDoCurso> planos(long cursoId) {
		curso(cursoId);
		return assinaturas.planosDoCurso(cursoId);
	}

	List<PlanoDoCurso> definirPlanos(long cursoId, Set<String> planos, Autor autor) {
		var curso = curso(cursoId);
		return assinaturas.definirPlanosDoCurso(cursoId, curso.getTitulo(), planos, autor);
	}

	// --- Currículo ------------------------------------------------------------

	CursoEdicao criarModulo(long cursoId, ModuloPedido p, Autor autor) {
		var curso = curso(cursoId);
		int ordem = curso.getModulos().stream().mapToInt(Modulo::getOrdem).max().orElse(0) + 1;
		var modulo = modulos.save(Modulo.novo(curso, ordem, p.titulo(), p.descricao()));
		curso.getModulos().add(modulo);
		curso.tocar(agora());
		auditar(EventoAuditoria.de(autor, "modulo.criado", "curso", cursoId,
				"Criou o módulo \"" + modulo.getTitulo() + "\" em \"" + curso.getTitulo() + "\""));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	CursoEdicao editarModulo(long moduloId, ModuloPedido p, Autor autor) {
		var modulo = modulo(moduloId);
		var antes = Map.<String, Object>of("titulo", modulo.getTitulo(), "descricao", Objects.toString(modulo.getDescricao(), ""));
		modulo.editar(p.titulo(), p.descricao());
		var curso = modulo.getCurso();
		curso.tocar(agora());
		auditar(EventoAuditoria.alteracao(autor, "modulo.editado", "modulo", moduloId,
				"Editou o módulo \"" + modulo.getTitulo() + "\" de \"" + curso.getTitulo() + "\"", antes,
				Map.of("titulo", modulo.getTitulo(), "descricao", Objects.toString(modulo.getDescricao(), ""))));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	CursoEdicao excluirModulo(long moduloId, Autor autor) {
		var modulo = modulo(moduloId);
		if (!modulo.getAulas().isEmpty()) {
			throw ErroApi.conflito(null, "Mova ou exclua as aulas antes de excluir o módulo.");
		}
		var curso = modulo.getCurso();
		curso.getModulos().remove(modulo);
		modulos.delete(modulo);
		curso.tocar(agora());
		auditar(EventoAuditoria.de(autor, "modulo.excluido", "curso", curso.getId(),
				"Excluiu o módulo \"" + modulo.getTitulo() + "\" de \"" + curso.getTitulo() + "\""));
		return CursoEdicao.de(curso);
	}

	CursoEdicao criarAula(long moduloId, AulaPedido p, Autor autor) {
		var modulo = modulo(moduloId);
		int ordem = modulo.getAulas().stream().mapToInt(Aula::getOrdem).max().orElse(0) + 1;
		var aula = aulas.save(Aula.nova(modulo, ordem, alteracao(p, null)));
		modulo.getAulas().add(aula);
		var curso = modulo.getCurso();
		curso.tocar(agora());
		auditar(EventoAuditoria.de(autor, "aula.criada", "curso", curso.getId(),
				"Criou a aula \"" + aula.getTitulo() + "\" em \"" + curso.getTitulo() + "\""));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	CursoEdicao editarAula(long aulaId, AulaPedido p, Autor autor) {
		var aula = aula(aulaId);
		var antes = retrato(aula);
		aula.editar(alteracao(p, aula));
		var curso = aula.getModulo().getCurso();
		curso.tocar(agora());
		auditar(EventoAuditoria.alteracao(autor, "aula.editada", "aula", aulaId,
				"Editou a aula \"" + aula.getTitulo() + "\" de \"" + curso.getTitulo() + "\"", antes, retrato(aula)));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	CursoEdicao excluirAula(long aulaId, Autor autor) {
		var aula = aula(aulaId);
		var modulo = aula.getModulo();
		var curso = modulo.getCurso();
		try {
			materiais.deleteAll(aula.getMateriais());
			modulo.getAulas().remove(aula);
			aulas.delete(aula);
			aulas.flush();
		}
		catch (DataIntegrityViolationException e) {
			throw ErroApi.conflito(null,
					"Esta aula já tem alunos com progresso ou anotações. Despublique a aula em vez de excluir.");
		}
		curso.tocar(agora());
		auditar(EventoAuditoria.de(autor, "aula.excluida", "curso", curso.getId(),
				"Excluiu a aula \"" + aula.getTitulo() + "\" de \"" + curso.getTitulo() + "\""));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	CursoEdicao adicionarMaterial(long aulaId, MaterialPedido p, Autor autor) {
		var aula = aula(aulaId);
		if (!MATERIAL.matcher(p.chave()).matches()) {
			throw ErroApi.invalido("chave", "Envie o arquivo pelo painel.");
		}
		int ordem = aula.getMateriais().stream().mapToInt(Material::getOrdem).max().orElse(0) + 1;
		var material = materiais.save(Material.novo(aula, ordem, p.nome(), p.chave(), p.tamanhoBytes(), p.tipoMime()));
		aula.getMateriais().add(material);
		var curso = aula.getModulo().getCurso();
		auditar(EventoAuditoria.de(autor, "material.adicionado", "aula", aulaId,
				"Anexou \"" + material.getNome() + "\" à aula \"" + aula.getTitulo() + "\""));
		return CursoEdicao.de(curso);
	}

	CursoEdicao excluirMaterial(long materialId, Autor autor) {
		var material = materiais.findById(materialId)
			.orElseThrow(() -> ErroApi.naoEncontrado("Material não encontrado."));
		var aula = material.getAula();
		aula.getMateriais().remove(material);
		materiais.delete(material);
		auditar(EventoAuditoria.de(autor, "material.excluido", "aula", aula.getId(),
				"Removeu \"" + material.getNome() + "\" da aula \"" + aula.getTitulo() + "\""));
		return CursoEdicao.de(aula.getModulo().getCurso());
	}

	/**
	 * Nova ordem do currículo (arrastar e soltar ou subir/descer). O pedido traz
	 * todos os módulos e todas as aulas do curso; aulas podem mudar de módulo.
	 */
	CursoEdicao ordenar(long cursoId, OrdemPedido pedido, Autor autor) {
		var curso = curso(cursoId);
		var modulosDoCurso = new HashMap<Long, Modulo>();
		var aulasDoCurso = new HashMap<Long, Aula>();
		for (var m : curso.getModulos()) {
			modulosDoCurso.put(m.getId(), m);
			m.getAulas().forEach(a -> aulasDoCurso.put(a.getId(), a));
		}
		var idsModulos = pedido.modulos().stream().map(CatalogoAdminDtos.ModuloOrdem::id).toList();
		var idsAulas = pedido.modulos().stream().flatMap(m -> m.aulas().stream()).toList();
		if (!semRepetir(idsModulos).equals(modulosDoCurso.keySet()) || idsModulos.size() != modulosDoCurso.size()
				|| !semRepetir(idsAulas).equals(aulasDoCurso.keySet()) || idsAulas.size() != aulasDoCurso.size()) {
			throw ErroApi.conflito(null, "O currículo mudou em outra aba. Recarregue a página e tente de novo.");
		}
		int ordemModulo = 1;
		curso.getModulos().clear();
		for (var item : pedido.modulos()) {
			var modulo = modulosDoCurso.get(item.id());
			modulo.reordenar(ordemModulo++);
			curso.getModulos().add(modulo);
			modulo.getAulas().clear();
			int ordemAula = 1;
			for (var aulaId : item.aulas()) {
				var aula = aulasDoCurso.get(aulaId);
				aula.mover(modulo, ordemAula++);
				modulo.getAulas().add(aula);
			}
		}
		curso.tocar(agora());
		auditar(EventoAuditoria.de(autor, "curriculo.reordenado", "curso", cursoId,
				"Reordenou o currículo de \"" + curso.getTitulo() + "\""));
		vitrineMudou(curso);
		return CursoEdicao.de(curso);
	}

	// --- Categorias -----------------------------------------------------------

	@Transactional(readOnly = true)
	List<CategoriaAdmin> categorias() {
		var contagem = contagem(categorias.cursosPorCategoria());
		return categorias.findAllByOrderByOrdem()
			.stream()
			.map(c -> new CategoriaAdmin(c.getId(), c.getSlug(), c.getNome(), c.getDescricao(), c.getOrdem(),
					contagem.getOrDefault(c.getId(), 0L)))
			.toList();
	}

	List<CategoriaAdmin> criarCategoria(CategoriaPedido p, Autor autor) {
		if (categorias.existsBySlug(p.slug())) {
			throw ErroApi.conflito("slug", "Já existe um tema com este endereço.");
		}
		var c = categorias.save(Categoria.nova(p.slug(), p.nome(), p.descricao(), categorias.maiorOrdem() + 1));
		auditar(EventoAuditoria.de(autor, "categoria.criada", "categoria", c.getId(), "Criou o tema \"" + c.getNome() + "\""));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return categorias();
	}

	List<CategoriaAdmin> editarCategoria(long id, CategoriaPedido p, Autor autor) {
		var c = categoria(id);
		if (!c.getSlug().equals(p.slug()) && categorias.existsBySlug(p.slug())) {
			throw ErroApi.conflito("slug", "Já existe um tema com este endereço.");
		}
		var antes = Map.<String, Object>of("nome", c.getNome(), "slug", c.getSlug(), "descricao", Objects.toString(c.getDescricao(), ""));
		c.editar(p.slug(), p.nome(), p.descricao());
		auditar(EventoAuditoria.alteracao(autor, "categoria.editado", "categoria", id, "Editou o tema \"" + c.getNome() + "\"",
				antes, Map.of("nome", c.getNome(), "slug", c.getSlug(), "descricao", Objects.toString(c.getDescricao(), ""))));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return categorias();
	}

	List<CategoriaAdmin> excluirCategoria(long id, Autor autor) {
		var c = categoria(id);
		if (contagem(categorias.cursosPorCategoria()).getOrDefault(id, 0L) > 0) {
			throw ErroApi.conflito(null, "Há cursos neste tema. Mude o tema desses cursos antes de excluir.");
		}
		categorias.delete(c);
		auditar(EventoAuditoria.de(autor, "categoria.excluida", "categoria", id, "Excluiu o tema \"" + c.getNome() + "\""));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return categorias();
	}

	List<CategoriaAdmin> ordenarCategorias(List<Long> ids, Autor autor) {
		var todas = categorias.findAllByOrderByOrdem();
		var porId = new HashMap<Long, Categoria>();
		todas.forEach(c -> porId.put(c.getId(), c));
		if (ids.size() != todas.size() || !semRepetir(ids).equals(porId.keySet())) {
			throw ErroApi.conflito(null, "A lista de temas mudou. Recarregue a página e tente de novo.");
		}
		for (int i = 0; i < ids.size(); i++) {
			porId.get(ids.get(i)).reordenar(i + 1);
		}
		auditar(EventoAuditoria.de(autor, "categoria.reordenada", "categoria", "todas", "Mudou a ordem dos temas"));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return categorias();
	}

	// --- Instrutores ----------------------------------------------------------

	@Transactional(readOnly = true)
	List<InstrutorAdmin> instrutores() {
		var contagem = contagem(instrutores.cursosPorInstrutor());
		return instrutores.findAllByOrderByNome()
			.stream()
			.map(i -> new InstrutorAdmin(i.getId(), i.getNome(), i.getTitulo(), i.getBio(), i.getFotoUrl(),
					contagem.getOrDefault(i.getId(), 0L)))
			.toList();
	}

	List<InstrutorAdmin> criarInstrutor(InstrutorPedido p, Autor autor) {
		var i = instrutores.save(Instrutor.novo(p.nome(), p.titulo(), p.bio(), foto(p.fotoUrl())));
		auditar(EventoAuditoria.de(autor, "instrutor.criado", "instrutor", i.getId(), "Cadastrou \"" + i.getNome() + "\""));
		return instrutores();
	}

	List<InstrutorAdmin> editarInstrutor(long id, InstrutorPedido p, Autor autor) {
		var i = instrutores.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Instrutor não encontrado."));
		var antes = retrato(i);
		i.editar(p.nome(), p.titulo(), p.bio(), foto(p.fotoUrl()));
		auditar(EventoAuditoria.alteracao(autor, "instrutor.editado", "instrutor", id, "Editou \"" + i.getNome() + "\"",
				antes, retrato(i)));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return instrutores();
	}

	List<InstrutorAdmin> excluirInstrutor(long id, Autor autor) {
		var i = instrutores.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Instrutor não encontrado."));
		if (contagem(instrutores.cursosPorInstrutor()).getOrDefault(id, 0L) > 0) {
			throw ErroApi.conflito(null, "Este instrutor aparece em cursos. Tire-o dos cursos antes de excluir.");
		}
		instrutores.delete(i);
		auditar(EventoAuditoria.de(autor, "instrutor.excluido", "instrutor", id, "Excluiu \"" + i.getNome() + "\""));
		return instrutores();
	}

	// --- Apoio ----------------------------------------------------------------

	/** "Edição de Takes Reais!" → "edicao-de-takes-reais". */
	static String slugDe(String texto) {
		var semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		var slug = semAcento.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
		if (slug.length() > 100) {
			slug = slug.substring(0, 100).replaceAll("-+$", "");
		}
		return slug.isEmpty() ? "curso" : slug;
	}

	private String slugLivre(String base, String atual) {
		var slug = base;
		int n = 2;
		while (!slug.equals(atual) && cursos.existsBySlug(slug)) {
			slug = base + "-" + n++;
		}
		return slug;
	}

	private Aula.Alteracao alteracao(AulaPedido p, Aula atual) {
		var video = vazioParaNulo(p.videoId());
		if (video != null && !VIDEO.matcher(video).matches()) {
			throw ErroApi.invalido("videoId", "Id de vídeo inválido. Envie o vídeo pelo painel ou cole o id do provedor.");
		}
		var legenda = vazioParaNulo(p.legendaUrl());
		if (legenda != null && !LEGENDA.matcher(legenda).matches()) {
			throw ErroApi.invalido("legendaUrl", "Envie a legenda pelo painel.");
		}
		boolean publicada = p.publicada() == null ? (atual == null || atual.isPublicada()) : p.publicada();
		return new Aula.Alteracao(p.titulo(), p.tipo(), p.resumo(), p.conteudo(), video, p.duracaoSegundos(),
				Boolean.TRUE.equals(p.previa()), legenda, publicada);
	}

	private static String foto(String url) {
		var f = vazioParaNulo(url);
		if (f != null && !FOTO.matcher(f).matches()) {
			throw ErroApi.invalido("fotoUrl", "Envie a foto pelo painel.");
		}
		return f;
	}

	private void mudouStatus(Curso curso, StatusCurso antes, String acao, String verbo, Autor autor) {
		if (antes == curso.getStatus()) {
			return;
		}
		auditar(EventoAuditoria.alteracao(autor, acao, "curso", curso.getId(), verbo + " \"" + curso.getTitulo() + "\"",
				Map.of("status", antes.name()), Map.of("status", curso.getStatus().name())));
		eventos.publishEvent(SiteDesatualizado.catalogo(curso.getSlug()));
	}

	/** Rascunho não aparece no site: só o que está publicado precisa refazer o cache. */
	private void vitrineMudou(Curso curso, String... outrosSlugs) {
		if (curso.isPublicado()) {
			var slugs = new ArrayList<String>(List.of(outrosSlugs));
			slugs.add(curso.getSlug());
			eventos.publishEvent(SiteDesatualizado.catalogo(slugs.toArray(String[]::new)));
		}
	}

	private void auditar(EventoAuditoria evento) {
		eventos.publishEvent(evento);
	}

	private Curso curso(long id) {
		return cursos.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Curso não encontrado."));
	}

	private Modulo modulo(long id) {
		return modulos.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Módulo não encontrado."));
	}

	private Aula aula(long id) {
		return aulas.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Aula não encontrada."));
	}

	private Categoria categoria(long id) {
		return categorias.findById(id).orElseThrow(() -> ErroApi.invalido("categoriaId", "Tema não encontrado."));
	}

	private static Map<String, Object> retrato(Curso c) {
		var m = new LinkedHashMap<String, Object>();
		m.put("titulo", c.getTitulo());
		m.put("subtitulo", c.getSubtitulo());
		m.put("slug", c.getSlug());
		m.put("numero", c.getNumero());
		m.put("tema", c.getCategoria().getNome());
		m.put("nivel", c.getNivel().name());
		m.put("idioma", c.getIdioma());
		m.put("descricao", cortar(c.getDescricao(), 400));
		m.put("capa", c.getCapaUrl());
		m.put("textoAlternativo", c.getCapaAlt());
		m.put("ferramentas", List.copyOf(c.getFerramentas()));
		m.put("oQueAprende", List.copyOf(c.getOQueAprende()));
		m.put("requisitos", List.copyOf(c.getRequisitos()));
		m.put("paraQuemE", List.copyOf(c.getParaQuemE()));
		m.put("resultadoFinal", c.getResultadoFinal());
		m.put("destaque", c.isDestaque());
		m.put("certificado", c.isCertificadoHabilitado());
		m.put("cargaHorariaMinutos", c.getCargaHorariaMinutos());
		m.put("seoTitulo", c.getSeoTitulo());
		m.put("seoDescricao", c.getSeoDescricao());
		m.put("instrutores", c.getInstrutores().stream().map(Instrutor::getNome).toList());
		return m;
	}

	private static Map<String, Object> retrato(Aula a) {
		var m = new LinkedHashMap<String, Object>();
		m.put("titulo", a.getTitulo());
		m.put("tipo", a.getTipo().name());
		m.put("resumo", a.getResumo());
		m.put("conteudo", cortar(a.getConteudo(), 400));
		m.put("video", a.getVideoId());
		m.put("duracaoSegundos", a.getDuracaoSegundos());
		m.put("previa", a.isPrevia());
		m.put("legenda", a.getLegendaUrl());
		m.put("publicada", a.isPublicada());
		return m;
	}

	private static Map<String, Object> retrato(Instrutor i) {
		var m = new LinkedHashMap<String, Object>();
		m.put("nome", i.getNome());
		m.put("titulo", i.getTitulo());
		m.put("bio", cortar(i.getBio(), 400));
		m.put("foto", i.getFotoUrl());
		return m;
	}

	private static Map<Long, Long> contagem(List<Object[]> linhas) {
		var mapa = new HashMap<Long, Long>();
		for (var l : linhas) {
			mapa.put((Long) l[0], ((Number) l[1]).longValue());
		}
		return mapa;
	}

	private static <T> Set<T> semRepetir(List<T> lista) {
		return new HashSet<>(lista);
	}

	private static List<String> lista(List<String> itens) {
		return itens == null ? List.of()
				: itens.stream().filter(Objects::nonNull).map(String::strip).filter(s -> !s.isEmpty()).toList();
	}

	private static String texto(String s) {
		return s == null ? "" : s.strip();
	}

	private static String vazioParaNulo(String s) {
		return s == null || s.isBlank() ? null : s.strip();
	}

	private static boolean preenchido(String s) {
		return s != null && !s.isBlank();
	}

	private static String cortar(String s, int max) {
		return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
	}

	private Instant agora() {
		return relogio.instant();
	}

}

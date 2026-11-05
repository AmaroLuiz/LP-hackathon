package br.com.potencia.administracao;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.aprendizado.AprendizadoDtos.MeuCurso;
import br.com.potencia.aprendizado.AprendizadoService;
import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.assinaturas.AssinaturasService.AcessoManualResposta;
import br.com.potencia.assinaturas.AssinaturasService.AssinaturaResposta;	
import br.com.potencia.assinaturas.AssinaturasService.PlanoAtivo;
import br.com.potencia.assinaturas.AssinaturasService.ReceitaDoMes;
import br.com.potencia.auditoria.Auditoria;
import br.com.potencia.auditoria.Auditoria.Registro;
import br.com.potencia.catalogo.CatalogoDtos.CursoAdminLinha;
import br.com.potencia.catalogo.CatalogoService;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.contas.ContasAdmin;
import br.com.potencia.contas.ContasAdmin.CadastrosNoDia;
import br.com.potencia.contas.ContasAdmin.Filtro;
import br.com.potencia.contas.ContasAdmin.UsuarioDetalhe;
import br.com.potencia.contas.ContasAdmin.UsuarioLinha;

/**
 * O que o painel admin mostra juntando vários módulos: a visão geral (métricas)
 * e a ficha de cada usuário (conta, assinatura, acessos, cursos e histórico).
 */
@Service
@Transactional(readOnly = true)
class PainelAdmin {

	static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	record ConclusaoLinha(long cursoId, int numero, String titulo, long matriculas, long concluidas, int taxa) {
	}

	record AulaParadaLinha(long aulaId, String aula, String curso, long alunos) {
	}

	record Metricas(Instant geradoEm, long alunos, long verificados, long novos7, long novos30,
			List<CadastrosNoDia> cadastrosPorDia, long ativos7, long ativos30, long assinaturasAtivas,
			long receitaMensalCentavos, long receitaConfirmadaNoMesCentavos, long emAtraso, long fundadores,
			long cancelamentosNoMes, List<PlanoAtivo> ativasPorPlano, List<ReceitaDoMes> receitaPorMes,
			List<ConclusaoLinha> conclusaoPorCurso, List<AulaParadaLinha> aulasParadas) {
	}

	record UsuarioItem(UUID id, String nome, String email, String papel, boolean emailVerificado, boolean bloqueado,
			String plano, Instant criadoEm, Instant ultimoAcessoEm) {
	}

	record AcessoItem(UUID id, Long cursoId, String curso, String planoId, String plano, String motivo,
			String concedidoPor, Instant expiraEm, Instant criadoEm, boolean vigente) {
	}

	record FichaUsuario(UsuarioDetalhe conta, AssinaturaResposta assinatura, List<AcessoItem> acessos,
			List<MeuCurso> cursos, List<Registro> historico) {
	}

	private final ContasAdmin contas;

	private final AssinaturasService assinaturas;

	private final AprendizadoService aprendizado;

	private final CatalogoService catalogo;

	private final Auditoria auditoria;

	private final Clock relogio;

	PainelAdmin(ContasAdmin contas, AssinaturasService assinaturas, AprendizadoService aprendizado,
			CatalogoService catalogo, Auditoria auditoria, Clock relogio) {
		this.contas = contas;
		this.assinaturas = assinaturas;
		this.aprendizado = aprendizado;
		this.catalogo = catalogo;
		this.auditoria = auditoria;
		this.relogio = relogio;
	}

	Metricas metricas() {
		var agora = relogio.instant();
		var inicioDoMes = LocalDate.ofInstant(agora, FUSO).withDayOfMonth(1).atStartOfDay(FUSO).toInstant();
		var conta = contas.metricas();
		var receita = assinaturas.metricas(inicioDoMes);
		var estudo = aprendizado.metricas();
		var cursos = new HashMap<Long, CursoAdminLinha>();
		catalogo.listarParaAdmin().forEach(c -> cursos.put(c.id(), c));
		var conclusao = estudo.conclusao()
			.stream()
			.filter(c -> cursos.containsKey(c.cursoId()))
			.map(c -> new ConclusaoLinha(c.cursoId(), cursos.get(c.cursoId()).numero(), cursos.get(c.cursoId()).titulo(),
					c.matriculas(), c.concluidas(), c.taxa()))
			.sorted((a, b) -> Integer.compare(a.numero(), b.numero()))
			.toList();
		var paradas = estudo.paradas()
			.stream()
			.map(p -> catalogo.aula(p.aulaId())
				.map(a -> new AulaParadaLinha(p.aulaId(), a.titulo(), a.cursoTitulo(), p.alunos()))
				.orElse(null))
			.filter(p -> p != null)
			.toList();
		return new Metricas(agora, conta.alunos(), conta.verificados(), conta.novos7(), conta.novos30(), conta.porDia(),
				estudo.ativos7(), estudo.ativos30(), receita.assinaturasAtivas(), receita.receitaMensalCentavos(),
				receita.receitaConfirmadaNoMesCentavos(), receita.emAtraso(), receita.fundadores(),
				receita.cancelamentosNoMes(), receita.ativasPorPlano(), receita.receitaPorMes(), conclusao, paradas);
	}

	Pagina<UsuarioItem> usuarios(Filtro filtro, String plano, Integer pagina, Integer tamanho) {
		var f = comPlano(filtro, plano);
		var resultado = contas.buscar(f, pagina, tamanho);
		var planos = assinaturas.planoAtual(resultado.itens().stream().map(UsuarioLinha::id).toList());
		return new Pagina<>(resultado.itens().stream().map(u -> item(u, planos.get(u.id()))).toList(), resultado.pagina(),
				resultado.tamanho(), resultado.total());
	}

	List<UsuarioItem> todosOsUsuarios(Filtro filtro, String plano) {
		var lista = contas.todos(comPlano(filtro, plano));
		var planos = assinaturas.planoAtual(lista.stream().map(UsuarioLinha::id).toList());
		return lista.stream().map(u -> item(u, planos.get(u.id()))).toList();
	}

	FichaUsuario ficha(UUID id) {
		var conta = contas.detalhe(id).orElseThrow(() -> ErroApi.naoEncontrado("Conta não encontrada."));
		var acessos = assinaturas.acessosManuais(id);
		var nomes = contas.nomes(acessos.stream().map(AcessoManualResposta::concedidoPor).distinct().toList());
		var titulos = new HashMap<Long, String>();
		catalogo.listarParaAdmin().forEach(c -> titulos.put(c.id(), c.titulo()));
		var itens = acessos.stream()
			.map(a -> new AcessoItem(a.id(), a.cursoId(), a.cursoId() == null ? null : titulos.get(a.cursoId()),
					a.planoId(), a.planoNome(), a.motivo(), nomes.getOrDefault(a.concedidoPor(), "—"), a.expiraEm(),
					a.criadoEm(), a.vigente()))
			.toList();
		return new FichaUsuario(conta, assinaturas.atual(id).orElse(null), itens, aprendizado.cursosDoUsuario(id),
				auditoria.doAlvo("usuario", id.toString(), 20));
	}

	/** Antes de conceder acesso: a conta e o curso precisam existir. */
	void conferirAcesso(UUID usuarioId, Long cursoId) {
		contas.detalhe(usuarioId).orElseThrow(() -> ErroApi.naoEncontrado("Conta não encontrada."));
		if (cursoId != null && catalogo.listarParaAdmin().stream().noneMatch(c -> c.id().equals(cursoId))) {
			throw ErroApi.invalido("cursoId", "Curso não encontrado.");
		}
	}

	private Filtro comPlano(Filtro filtro, String plano) {
		if (plano == null || plano.isBlank()) {
			return filtro;
		}
		var ids = new HashSet<>(assinaturas.assinantesDoPlano(plano));
		return new Filtro(filtro.busca(), filtro.papel(), filtro.verificado(), filtro.bloqueado(), ids);
	}

	private static UsuarioItem item(UsuarioLinha u, String plano) {
		return new UsuarioItem(u.id(), u.nome(), u.email(), u.papel().name(), u.emailVerificado(), u.bloqueado(), plano,
				u.criadoEm(), u.ultimoAcessoEm());
	}

}

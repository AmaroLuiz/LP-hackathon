package br.com.potencia.auditoria;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.criteria.Predicate;

import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.Pagina;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

interface RegistroAuditoriaRepository
		extends JpaRepository<RegistroAuditoria, UUID>, JpaSpecificationExecutor<RegistroAuditoria> {

	Optional<RegistroAuditoria> findFirstByAutorIdAndAcaoAndAlvoTipoAndAlvoIdOrderByQuandoDesc(UUID autorId,
			String acao, String alvoTipo, String alvoId);

}

/**
 * Grava as ações de admin e os eventos sensíveis de conta. Escuta os eventos na
 * mesma transação de quem publicou: se a ação for desfeita, o registro também.
 */
@Service
@Transactional
public class Auditoria {

	/** Edições do mesmo item pela mesma pessoa dentro desta janela viram um registro só. */
	static final Duration JANELA_EDICAO = Duration.ofMinutes(10);

	private static final TypeReference<Map<String, Object>> MAPA = new TypeReference<>() {
	};

	private final RegistroAuditoriaRepository registros;

	private final Clock relogio;

	private final JsonMapper json = JsonMapper.builder().build();

	Auditoria(RegistroAuditoriaRepository registros, Clock relogio) {
		this.registros = registros;
		this.relogio = relogio;
	}

	public record Registro(UUID id, Instant quando, UUID autorId, String autorEmail, String acao, String alvoTipo,
			String alvoId, String resumo, Map<String, Object> antes, Map<String, Object> depois, String ip) {
	}

	public record Filtro(String acao, String autor, String alvoTipo, String alvoId, Instant de, Instant ate) {
	}

	@EventListener
	void registrar(EventoAuditoria evento) {
		if (evento.semMudancas() && ehEdicao(evento.acao())) {
			return;
		}
		var agora = relogio.instant();
		var autorId = evento.autor() == null ? null : evento.autor().id();
		if (autorId != null && ehEdicao(evento.acao())) {
			var recente = registros
				.findFirstByAutorIdAndAcaoAndAlvoTipoAndAlvoIdOrderByQuandoDesc(autorId, evento.acao(), evento.alvoTipo(),
						evento.alvoId())
				.filter(r -> r.getQuando().isAfter(agora.minus(JANELA_EDICAO)));
			if (recente.isPresent()) {
				var r = recente.get();
				var antes = ler(r.getAntes());
				var depois = ler(r.getDepois());
				evento.antes().forEach(antes::putIfAbsent);
				depois.putAll(evento.depois());
				// Campo que voltou ao valor original deixa de ser mudança.
				var desfeitos = antes.keySet()
					.stream()
					.filter(campo -> Objects.equals(antes.get(campo), depois.get(campo)))
					.toList();
				desfeitos.forEach(campo -> {
					antes.remove(campo);
					depois.remove(campo);
				});
				r.juntar(agora, cortar(evento.resumo(), 300), escrever(antes), escrever(depois));
				registros.save(r);
				return;
			}
		}
		registros.save(RegistroAuditoria.novo(agora, autorId, evento.autor() == null ? null : evento.autor().email(),
				evento.acao(), evento.alvoTipo(), evento.alvoId(), cortar(evento.resumo(), 300),
				escrever(evento.antes()), escrever(evento.depois()), ip()));
	}

	@Transactional(readOnly = true)
	public Pagina<Registro> buscar(Filtro f, Integer pagina, Integer tamanho) {
		Specification<RegistroAuditoria> spec = (raiz, consulta, cb) -> {
			var condicoes = new java.util.ArrayList<Predicate>();
			if (preenchido(f.acao())) {
				condicoes.add(cb.equal(raiz.get("acao"), f.acao()));
			}
			if (preenchido(f.autor())) {
				condicoes.add(cb.like(cb.lower(raiz.get("autorEmail")), "%" + f.autor().strip().toLowerCase() + "%"));
			}
			if (preenchido(f.alvoTipo())) {
				condicoes.add(cb.equal(raiz.get("alvoTipo"), f.alvoTipo()));
			}
			if (preenchido(f.alvoId())) {
				condicoes.add(cb.equal(raiz.get("alvoId"), f.alvoId()));
			}
			if (f.de() != null) {
				condicoes.add(cb.greaterThanOrEqualTo(raiz.get("quando"), f.de()));
			}
			if (f.ate() != null) {
				condicoes.add(cb.lessThan(raiz.get("quando"), f.ate()));
			}
			return cb.and(condicoes.toArray(Predicate[]::new));
		};
		var pedido = Pagina.pedido(pagina, tamanho, Sort.by(Sort.Direction.DESC, "quando"));
		return Pagina.de(registros.findAll(spec, pedido), this::resposta);
	}

	/** As ações mais recentes sobre um item (ex.: histórico de um usuário no painel). */
	@Transactional(readOnly = true)
	public List<Registro> doAlvo(String alvoTipo, String alvoId, int limite) {
		return buscar(new Filtro(null, null, alvoTipo, alvoId, null, null), 1, limite).itens();
	}

	private Registro resposta(RegistroAuditoria r) {
		return new Registro(r.getId(), r.getQuando(), r.getAutorId(), r.getAutorEmail(), r.getAcao(), r.getAlvoTipo(),
				r.getAlvoId(), r.getResumo(), ler(r.getAntes()), ler(r.getDepois()), r.getIp());
	}

	private Map<String, Object> ler(String texto) {
		if (texto == null || texto.isBlank()) {
			return new LinkedHashMap<>();
		}
		return new LinkedHashMap<>(json.readValue(texto, MAPA));
	}

	private String escrever(Map<String, Object> mapa) {
		if (mapa == null || mapa.isEmpty()) {
			return null;
		}
		return cortar(json.writeValueAsString(mapa), 20_000);
	}

	private static String ip() {
		if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
			return atributos.getRequest().getRemoteAddr();
		}
		return null;
	}

	private static boolean preenchido(String s) {
		return s != null && !s.isBlank();
	}

	private static String cortar(String s, int max) {
		return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
	}

	/** "curso.editado", "aula.editada": edições que se juntam num registro só. */
	private static boolean ehEdicao(String acao) {
		return acao.endsWith(".editado") || acao.endsWith(".editada");
	}

}

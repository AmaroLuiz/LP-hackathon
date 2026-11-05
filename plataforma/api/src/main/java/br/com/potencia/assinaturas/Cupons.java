package br.com.potencia.assinaturas;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;

/** Cupons de desconto: criados no painel, informados no checkout. */
@Service
@Transactional
public class Cupons {

	private static final Pattern CODIGO = Pattern.compile("[A-Z0-9_-]{3,40}");

	/** O que a página de planos mostra quando a pessoa digita um cupom. */
	public record CupomValido(String codigo, int percentual, int meses, String descricao) {
	}

	public record CupomAdmin(UUID id, String codigo, String descricao, int percentual, int meses, String planoId,
			Instant validoAte, Integer limiteUsos, int usos, boolean ativo, Instant criadoEm) {

		static CupomAdmin de(Cupom c) {
			return new CupomAdmin(c.getId(), c.getCodigo(), c.getDescricao(), c.getPercentual(), c.getMeses(),
					c.getPlanoId(), c.getValidoAte(), c.getLimiteUsos(), c.getUsos(), c.isAtivo(), c.getCriadoEm());
		}

	}

	public record CupomPedido(String codigo, String descricao, Integer percentual, Integer meses, String planoId,
			Instant validoAte, Integer limiteUsos, Boolean ativo) {
	}

	private final CupomRepository cupons;

	private final PlanoRepository planos;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	Cupons(CupomRepository cupons, PlanoRepository planos, ApplicationEventPublisher eventos, Clock relogio) {
		this.cupons = cupons;
		this.planos = planos;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	/** Confere o cupom para o plano; recusa com a explicação em português. */
	@Transactional(readOnly = true)
	public CupomValido validar(String codigo, String planoId) {
		var c = valido(codigo, planoId);
		return new CupomValido(c.getCodigo(), c.getPercentual(), c.getMeses(), c.getDescricao());
	}

	Cupom valido(String codigo, String planoId) {
		var c = cupons.findByCodigo(Cupom.normalizar(codigo))
			.orElseThrow(() -> ErroApi.invalido("cupom", "Cupom não encontrado. Confira as letras e os números."));
		var motivo = c.motivoRecusa(planoId, relogio.instant());
		if (motivo != null) {
			throw ErroApi.invalido("cupom", motivo);
		}
		return c;
	}

	// --- Painel ------------------------------------------------------------------

	@Transactional(readOnly = true)
	public List<CupomAdmin> listar() {
		return cupons.findAllByOrderByCriadoEmDesc().stream().map(CupomAdmin::de).toList();
	}

	public CupomAdmin criar(CupomPedido p, Autor admin) {
		var codigo = Cupom.normalizar(p.codigo());
		if (!CODIGO.matcher(codigo).matches()) {
			throw ErroApi.invalido("codigo", "Use de 3 a 40 letras, números, hífen ou sublinhado (sem espaços).");
		}
		if (cupons.findByCodigo(codigo).isPresent()) {
			throw ErroApi.conflito("codigo", "Já existe um cupom com esse código.");
		}
		var c = Cupom.novo(codigo, relogio.instant());
		aplicar(c, p, true);
		cupons.save(c);
		eventos.publishEvent(EventoAuditoria.de(admin, "cupom.criado", "cupom", c.getId(),
				"Criou o cupom " + codigo + " (" + c.getPercentual() + "% por " + c.getMeses() + " mês(es))"));
		return CupomAdmin.de(c);
	}

	public CupomAdmin editar(UUID id, CupomPedido p, Autor admin) {
		var c = cupons.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Cupom não encontrado."));
		var antes = retrato(c);
		aplicar(c, p, false);
		eventos.publishEvent(EventoAuditoria.alteracao(admin, "cupom.editado", "cupom", id,
				"Editou o cupom " + c.getCodigo(), antes, retrato(c)));
		return CupomAdmin.de(c);
	}

	private void aplicar(Cupom c, CupomPedido p, boolean novo) {
		int percentual = p.percentual() != null ? p.percentual() : novo ? 0 : c.getPercentual();
		int meses = p.meses() != null ? p.meses() : novo ? 1 : c.getMeses();
		if (percentual < 1 || percentual > 100) {
			throw ErroApi.invalido("percentual", "O desconto vai de 1% a 100%.");
		}
		if (meses < 1 || meses > 24) {
			throw ErroApi.invalido("meses", "O desconto vale de 1 a 24 cobranças.");
		}
		if (p.limiteUsos() != null && p.limiteUsos() < 1) {
			throw ErroApi.invalido("limiteUsos", "O limite precisa ser de pelo menos 1 uso (ou vazio, sem limite).");
		}
		var planoId = p.planoId() == null || p.planoId().isBlank() ? null : p.planoId();
		if (planoId != null && planos.findById(planoId).isEmpty()) {
			throw ErroApi.invalido("planoId", "Plano não encontrado.");
		}
		c.editar(p.descricao(), percentual, meses, planoId, p.validoAte(), p.limiteUsos(),
				p.ativo() != null ? p.ativo() : novo || c.isAtivo());
	}

	private static Map<String, Object> retrato(Cupom c) {
		var m = new LinkedHashMap<String, Object>();
		m.put("descricao", c.getDescricao());
		m.put("percentual", c.getPercentual());
		m.put("meses", c.getMeses());
		m.put("planoId", c.getPlanoId());
		m.put("validoAte", c.getValidoAte() == null ? null : c.getValidoAte().toString());
		m.put("limiteUsos", c.getLimiteUsos());
		m.put("ativo", c.isAtivo());
		return m;
	}

}

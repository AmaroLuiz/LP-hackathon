package br.com.potencia.privacidade;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.aprendizado.AprendizadoService;
import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.comunidade.Comunidade;
import br.com.potencia.contas.ContaService;

/**
 * Direitos do titular (LGPD): baixar os próprios dados e excluir a conta. Cada
 * módulo cuida dos seus dados; aqui só se junta (exportar) e se coordena (excluir).
 */
@Service
public class Privacidade {

	private final ContaService contas;

	private final AssinaturasService assinaturas;

	private final AprendizadoService aprendizado;

	private final Comunidade comunidade;

	private final Clock relogio;

	/** Encarregado de dados (DPO) ou canal de privacidade, mostrado no arquivo exportado. */
	private final String contato;

	Privacidade(ContaService contas, AssinaturasService assinaturas, AprendizadoService aprendizado,
			Comunidade comunidade, Clock relogio, @Value("${potencia.privacidade.contato:}") String contato) {
		this.contas = contas;
		this.assinaturas = assinaturas;
		this.aprendizado = aprendizado;
		this.comunidade = comunidade;
		this.relogio = relogio;
		this.contato = contato;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> exportar(UUID usuarioId) {
		var dados = new LinkedHashMap<String, Object>();
		dados.put("geradoEm", relogio.instant());
		dados.put("sobre", "Todos os dados pessoais que a PotencIA guarda sobre você. Dúvidas ou pedidos: "
				+ (contato.isBlank() ? "o contato indicado na Política de privacidade." : contato + "."));
		dados.put("conta", contas.exportar(usuarioId));
		dados.put("assinaturas", assinaturas.exportar(usuarioId));
		dados.put("aprendizado", aprendizado.exportar(usuarioId));
		dados.put("comunidade", comunidade.exportar(usuarioId));
		return dados;
	}

	/**
	 * Exclui a conta: para as cobranças, apaga progresso, anotações, certificados
	 * e avaliações, esconde perguntas e respostas, e anonimiza a conta. Tudo numa
	 * transação: ou sai tudo, ou nada.
	 */
	@Transactional
	public void excluirConta(UUID usuarioId, String emailDigitado) {
		contas.conferirConfirmacao(usuarioId, emailDigitado);
		assinaturas.encerrarPorExclusao(usuarioId);
		aprendizado.excluirDadosDe(usuarioId);
		comunidade.excluirDadosDe(usuarioId);
		contas.anonimizar(usuarioId);
	}

}

package br.com.potencia.assinaturas;

import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.com.potencia.contas.ContaService;
import br.com.potencia.email.EnviadorEmail;
import br.com.potencia.email.EnviadorEmail.Email;

/**
 * E-mails da assinatura. Falha no envio não desfaz nada: o estado da
 * assinatura vale mais que o aviso (e aparece em "Minha assinatura").
 */
@Component
class Notificacoes {

	private static final Logger log = LoggerFactory.getLogger(Notificacoes.class);

	private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM/yyyy")
		.withZone(ZoneId.of("America/Sao_Paulo"));

	private final EnviadorEmail email;

	private final ContaService contas;

	private final String webUrl;

	Notificacoes(EnviadorEmail email, ContaService contas, @Value("${potencia.web-url}") String webUrl) {
		this.email = email;
		this.contas = contas;
		this.webUrl = webUrl;
	}

	void ativada(UUID usuarioId, String plano) {
		enviarPara(usuarioId, "Sua assinatura PotencIA está ativa", nome -> """
				Olá, %s.

				Sua assinatura do plano %s está ativa. Os cursos do plano já estão liberados:

				%s/minha-conta/cursos

				Para ver cobranças, trocar de plano ou cancelar, use "Minha assinatura":
				%s/minha-conta/assinatura
				""".formatted(nome, plano, webUrl, webUrl));
	}

	void pagamentoConfirmado(UUID usuarioId, String plano, int valorCentavos, Instant acessoAte) {
		enviarPara(usuarioId, "Pagamento confirmado", nome -> """
				Olá, %s.

				Recebemos o pagamento de %s do plano %s. Seu acesso vai até %s e renova sozinho.

				Histórico e faturas: %s/minha-conta/assinatura
				""".formatted(nome, reais(valorCentavos), plano, DIA.format(acessoAte), webUrl));
	}

	void pagamentoRecusado(UUID usuarioId, String urlFatura) {
		enviarPara(usuarioId, "Não conseguimos cobrar sua assinatura", nome -> """
				Olá, %s.

				O pagamento da sua assinatura foi recusado pelo cartão. Para continuar com acesso,
				atualize a forma de pagamento por este link:

				%s

				Se preferir, fale com a gente respondendo este e-mail.
				""".formatted(nome, urlFatura != null ? urlFatura : webUrl + "/minha-conta/assinatura"));
	}

	void emAtraso(UUID usuarioId, String urlFatura, Instant acessoAte) {
		enviarPara(usuarioId, "Sua assinatura está com pagamento atrasado", nome -> """
				Olá, %s.

				A cobrança da sua assinatura venceu e ainda não foi paga. Seu acesso continua até %s.
				Para pagar agora:

				%s
				""".formatted(nome, DIA.format(acessoAte),
				urlFatura != null ? urlFatura : webUrl + "/minha-conta/assinatura"));
	}

	void cancelada(UUID usuarioId, String plano, Instant acessoAte) {
		enviarPara(usuarioId, "Sua assinatura foi cancelada", nome -> """
				Olá, %s.

				O cancelamento do plano %s está feito. Nada mais será cobrado.
				Você continua com acesso aos cursos até %s.

				Mudou de ideia? Dá para reativar até lá, sem pagar nada a mais agora:
				%s/minha-conta/assinatura
				""".formatted(nome, plano, DIA.format(acessoAte), webUrl));
	}

	void convite(String para, String titular, String plano, String token, Instant expira) {
		enviar(new Email(para, titular + " convidou você para a PotencIA", """
				Olá.

				%s convidou você para usar a assinatura do plano %s da PotencIA, com acesso aos cursos
				de vídeos, artes e carrosséis com IA para o seu negócio.

				Para aceitar, abra o link abaixo (vale até %s) e entre ou crie sua conta com este e-mail:

				%s/equipe/convite?token=%s

				Se você não esperava este convite, ignore este e-mail.
				""".formatted(titular, plano, DIA.format(expira), webUrl, token)));
	}

	// -------------------------------------------------------------------------

	private void enviarPara(UUID usuarioId, String assunto, java.util.function.Function<String, String> texto) {
		contas.buscar(usuarioId).ifPresent(u -> enviar(new Email(u.email(), assunto, texto.apply(u.nome()))));
	}

	private void enviar(Email mensagem) {
		try {
			email.enviar(mensagem);
		}
		catch (RuntimeException e) {
			log.error("Falha ao enviar e-mail \"{}\"", mensagem.assunto(), e);
		}
	}

	static String reais(int centavos) {
		return NumberFormat.getCurrencyInstance(Locale.of("pt", "BR")).format(centavos / 100.0);
	}

}

package br.com.potencia.contas;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cria o primeiro admin a partir de ADMIN_EMAIL e ADMIN_SENHA_INICIAL, só se ainda
 * não existir nenhum. Ele é obrigado a trocar a senha no primeiro acesso.
 */
@Component
class AdminInicial implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminInicial.class);

	private final UsuarioRepository usuarios;

	private final PasswordEncoder senhas;

	private final Clock relogio;

	private final String email;

	private final String senhaInicial;

	AdminInicial(UsuarioRepository usuarios, PasswordEncoder senhas, Clock relogio,
			@Value("${potencia.admin.email:}") String email,
			@Value("${potencia.admin.senha-inicial:}") String senhaInicial) {
		this.usuarios = usuarios;
		this.senhas = senhas;
		this.relogio = relogio;
		this.email = ContaService.normalizar(email);
		this.senhaInicial = senhaInicial;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (usuarios.existsByPapelAndExcluidoEmIsNull(Papel.ADMIN)) {
			return;
		}
		if (email.isBlank() || senhaInicial.isBlank()) {
			log.warn("Nenhum admin cadastrado. Defina ADMIN_EMAIL e ADMIN_SENHA_INICIAL para criar o primeiro.");
			return;
		}
		if (senhaInicial.length() < 10) {
			throw new IllegalStateException("ADMIN_SENHA_INICIAL precisa ter pelo menos 10 caracteres.");
		}
		if (usuarios.existsByEmail(email)) {
			log.warn("Já existe uma conta com {}; promova-a a admin pelo banco ou use outro ADMIN_EMAIL.", email);
			return;
		}
		var agora = relogio.instant();
		var admin = Usuario.novo("Admin PotencIA", email, senhas.encode(senhaInicial), Papel.ADMIN, false, agora);
		admin.verificarEmail(agora);
		admin.exigirTrocaDeSenha();
		usuarios.save(admin);
		log.info("Admin inicial criado: {} (troca de senha obrigatória no primeiro acesso).", email);
	}

}

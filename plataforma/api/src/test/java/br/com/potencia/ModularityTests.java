package br.com.potencia;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/**
 * Garante que um módulo (catalogo, assinaturas...) não use as partes internas
 * de outro. Falha se alguém criar uma dependência circular ou atravessada.
 */
class ModularityTests {

	@Test
	void modulosRespeitamAsFronteiras() {
		ApplicationModules.of(PotenciaApiApplication.class).verify();
	}

}

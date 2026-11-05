package br.com.potencia.assinaturas;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planos")
class PlanoController {

	private final PlanoRepository planos;

	PlanoController(PlanoRepository planos) {
		this.planos = planos;
	}

	@GetMapping
	List<PlanoResposta> listar() {
		return planos.findAllByOrderByOrdem().stream().filter(Plano::isAtivo).map(PlanoResposta::de).toList();
	}

	record PlanoResposta(String id, String nome, int precoCentavos, int maxPessoas, List<String> itens,
			List<Long> cursos) {

		static PlanoResposta de(Plano p) {
			return new PlanoResposta(p.getId(), p.getNome(), p.getPrecoCentavos(), p.getMaxPessoas(),
					List.copyOf(p.getItens()), p.getCursos().stream().sorted().toList());
		}

	}

}

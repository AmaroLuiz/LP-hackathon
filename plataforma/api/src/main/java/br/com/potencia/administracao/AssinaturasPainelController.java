package br.com.potencia.administracao;

import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.assinaturas.AssinaturasService.AssinaturaAdmin;
import br.com.potencia.assinaturas.AssinaturasService.AssinaturaLinha;
import br.com.potencia.assinaturas.AssinaturasService.FiltroAssinaturas;
import br.com.potencia.assinaturas.StatusAssinatura;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.contas.ContasAdmin;
import br.com.potencia.contas.ContasAdmin.Pessoa;

/** Assinaturas e pagamentos no painel, com o nome e o e-mail de cada pessoa. Só admin. */
@RestController
@RequestMapping("/api/admin/assinaturas")
class AssinaturasPainelController {

	private final AssinaturasService assinaturas;

	private final ContasAdmin contas;

	AssinaturasPainelController(AssinaturasService assinaturas, ContasAdmin contas) {
		this.assinaturas = assinaturas;
		this.contas = contas;
	}

	record Linha(AssinaturaLinha assinatura, Pessoa pessoa) {
	}

	record Detalhe(AssinaturaAdmin detalhe, Pessoa pessoa, Map<UUID, Pessoa> membros) {
	}

	@GetMapping
	Pagina<Linha> listar(@RequestParam(required = false) String q, @RequestParam(required = false) StatusAssinatura status,
			@RequestParam(required = false) String plano, @RequestParam(required = false) Boolean fundador,
			@RequestParam(required = false) Integer pagina, @RequestParam(required = false) Integer tamanho) {
		var usuarios = q == null || q.isBlank() ? null : contas.idsPorBusca(q);
		var resultado = assinaturas.buscar(new FiltroAssinaturas(status, plano, fundador, usuarios), pagina, tamanho);
		var pessoas = contas.pessoas(resultado.itens().stream().map(AssinaturaLinha::usuarioId).toList());
		return new Pagina<>(resultado.itens().stream().map(a -> new Linha(a, pessoas.get(a.usuarioId()))).toList(),
				resultado.pagina(), resultado.tamanho(), resultado.total());
	}

	@GetMapping("/{id}")
	Detalhe detalhe(@PathVariable UUID id) {
		var d = assinaturas.detalheAdmin(id).orElseThrow(() -> ErroApi.naoEncontrado("Assinatura não encontrada."));
		var ids = new java.util.ArrayList<UUID>();
		ids.add(d.assinatura().usuarioId());
		d.equipe().stream().map(m -> m.usuarioId()).filter(x -> x != null).forEach(ids::add);
		var pessoas = contas.pessoas(ids);
		return new Detalhe(d, pessoas.get(d.assinatura().usuarioId()), pessoas);
	}

}

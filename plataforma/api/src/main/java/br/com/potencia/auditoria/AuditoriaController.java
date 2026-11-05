package br.com.potencia.auditoria;

import java.time.Instant;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.auditoria.Auditoria.Filtro;
import br.com.potencia.auditoria.Auditoria.Registro;
import br.com.potencia.compartilhado.Pagina;

/** Protegido por papel ADMIN no SecurityConfig (/api/admin/**). */
@RestController
class AuditoriaController {

	private final Auditoria auditoria;

	AuditoriaController(Auditoria auditoria) {
		this.auditoria = auditoria;
	}

	@GetMapping("/api/admin/auditoria")
	Pagina<Registro> buscar(@RequestParam(required = false) String acao, @RequestParam(required = false) String autor,
			@RequestParam(required = false) String alvoTipo, @RequestParam(required = false) String alvoId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant de,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant ate,
			@RequestParam(required = false) Integer pagina, @RequestParam(required = false) Integer tamanho) {
		return auditoria.buscar(new Filtro(acao, autor, alvoTipo, alvoId, de, ate), pagina, tamanho);
	}

}

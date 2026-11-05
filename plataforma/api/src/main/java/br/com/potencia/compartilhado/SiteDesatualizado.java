package br.com.potencia.compartilhado;

import java.util.Set;

/**
 * O conteúdo público mudou: as páginas em cache do site com essas tags precisam
 * ser refeitas ("catalogo", "curso:{slug}"). Avisado depois do commit.
 */
public record SiteDesatualizado(Set<String> tags) {

	public static SiteDesatualizado catalogo(String... slugs) {
		var tags = new java.util.LinkedHashSet<String>();
		tags.add("catalogo");
		for (var slug : slugs) {
			if (slug != null && !slug.isBlank()) {
				tags.add("curso:" + slug);
			}
		}
		return new SiteDesatualizado(Set.copyOf(tags));
	}

}

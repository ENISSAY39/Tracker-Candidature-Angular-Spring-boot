package io.github.enissay39.tracker.excelimport;

import io.github.enissay39.tracker.common.InvalidRequestException;

/**
 * Mode d'import du classeur (ADR 0002).
 */
public enum ImportMode {

	/** Premier chargement : refusé si la base contient déjà des candidatures. */
	INITIAL,

	/**
	 * Remplacement : candidatures, pistes et groupes sont supprimés puis rechargés, seulement si le nouveau classeur
	 * est accepté en entier.
	 */
	REPLACE;

	/**
	 * Mode demandé par le paramètre {@code mode} de la requête : absent pour un premier chargement,
	 * {@code replace} pour un remplacement.
	 */
	static ImportMode fromParameter(String mode) {
		if (mode == null) {
			return INITIAL;
		}
		if ("replace".equalsIgnoreCase(mode.trim())) {
			return REPLACE;
		}
		throw new InvalidRequestException("Mode d'import « " + mode + " » inconnu : seul « replace » est accepté.");
	}

}

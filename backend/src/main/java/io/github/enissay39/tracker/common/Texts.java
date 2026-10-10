package io.github.enissay39.tracker.common;

/**
 * Nettoyage des textes saisis : espaces de début et de fin retirés, texte facultatif vide enregistré à {@code null}.
 */
public final class Texts {

	private Texts() {
	}

	/**
	 * Texte sans ses espaces de début et de fin, ou {@code null} s'il est absent, vide ou fait d'espaces.
	 */
	public static String trimToNull(String text) {
		if (text == null) {
			return null;
		}
		String trimmed = text.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

}

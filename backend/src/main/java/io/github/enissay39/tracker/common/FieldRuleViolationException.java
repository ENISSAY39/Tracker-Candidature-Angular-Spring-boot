package io.github.enissay39.tracker.common;

/**
 * Une règle métier est violée sur un champ de la requête (400). {@code field} est le nom JSON du champ ; le message
 * est affiché tel quel à l'utilisateur.
 */
public class FieldRuleViolationException extends RuntimeException {

	private final String field;

	public FieldRuleViolationException(String field, String message) {
		super(message);
		this.field = field;
	}

	public String getField() {
		return field;
	}

}

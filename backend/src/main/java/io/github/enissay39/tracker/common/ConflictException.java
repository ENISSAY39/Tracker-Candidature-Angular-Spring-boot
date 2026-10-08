package io.github.enissay39.tracker.common;

/**
 * L'opération contredit l'état actuel des données (409). Le message est affiché tel quel à l'utilisateur.
 */
public class ConflictException extends RuntimeException {

	public ConflictException(String message) {
		super(message);
	}

}

package io.github.enissay39.tracker.common;

/**
 * La ressource demandée n'existe pas (404). Le message est affiché tel quel à l'utilisateur.
 */
public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String message) {
		super(message);
	}

}

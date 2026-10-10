package io.github.enissay39.tracker.common;

/**
 * La requête ne peut pas être traitée telle quelle, sans qu'un champ précis soit en cause (400), par exemple un
 * fichier importé incorrect. Le message est affiché tel quel à l'utilisateur.
 */
public class InvalidRequestException extends RuntimeException {

	public InvalidRequestException(String message) {
		super(message);
	}

}

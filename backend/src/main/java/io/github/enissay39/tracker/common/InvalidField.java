package io.github.enissay39.tracker.common;

/**
 * Élément de la propriété {@code errors} d'un 400 : champ en cause (nom JSON) et message pour l'utilisateur.
 */
record InvalidField(String field, String message) {
}

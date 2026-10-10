package io.github.enissay39.tracker.jobapplication.dto;

/**
 * Statut avec ses règles : {@code requiresSentOn} (date d'envoi obligatoire) et {@code closed} (plus d'échéance),
 * pour que le front n'ait pas à les redéfinir.
 */
public record StatusResponse(String code, String label, int order, boolean requiresSentOn, boolean closed,
		StatusCategoryResponse category) {
}

package io.github.enissay39.tracker.joblead.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Écart d'une piste, avec son motif obligatoire.
 */
public record DiscardLeadRequest(@NotBlank String reason) {
}

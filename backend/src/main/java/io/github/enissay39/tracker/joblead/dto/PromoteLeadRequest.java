package io.github.enissay39.tracker.joblead.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Promotion d'une piste : le groupe de la candidature créée, par son nom, créé s'il n'existe pas.
 */
public record PromoteLeadRequest(@NotBlank @Size(max = 100) String groupName) {
}

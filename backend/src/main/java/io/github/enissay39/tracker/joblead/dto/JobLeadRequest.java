package io.github.enissay39.tracker.joblead.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Création ou modification d'une piste.
 */
public record JobLeadRequest(@NotBlank String company, @NotBlank String jobTitle, String plannedCv, String remark) {
}

package io.github.enissay39.tracker.joblead.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Création ou modification d'une piste.
 */
public record JobLeadRequest(@NotBlank @Size(max = 255) String company, @NotBlank @Size(max = 255) String jobTitle,
		@Size(max = 255) String plannedCv, String remark) {
}

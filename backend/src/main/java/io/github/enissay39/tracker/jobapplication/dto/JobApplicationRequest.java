package io.github.enissay39.tracker.jobapplication.dto;

import java.time.LocalDate;

import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Création ou modification d'une candidature. Aucun numéro : il est attribué par le service. Le groupe se donne par
 * son nom et il est créé s'il n'existe pas.
 */
public record JobApplicationRequest(@NotBlank @Size(max = 100) String groupName,
		@NotBlank @Size(max = 255) String company, @NotBlank @Size(max = 255) String jobTitle,
		@NotNull ApplicationStatus status, LocalDate sentOn, @Size(max = 255) String deadlineLabel,
		LocalDate deadlineDate, String notes, @Size(max = 100) String startPeriod, @Size(max = 255) String channel,
		@Size(max = 255) String cvSent) {
}

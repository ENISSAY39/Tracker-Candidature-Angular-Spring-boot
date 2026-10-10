package io.github.enissay39.tracker.jobapplication.dto;

import java.time.LocalDate;

import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Changement rapide de statut. {@code sentOn} et {@code deadlineDate} absentes : les valeurs existantes sont
 * conservées.
 */
public record StatusChangeRequest(@NotNull ApplicationStatus status, LocalDate sentOn, LocalDate deadlineDate) {
}

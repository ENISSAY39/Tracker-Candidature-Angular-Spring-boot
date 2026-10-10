package io.github.enissay39.tracker.excelimport;

import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;

/**
 * Candidature lue dans le classeur : son numéro et ses champs.
 */
record ImportedApplication(int number, JobApplicationRequest request) {
}

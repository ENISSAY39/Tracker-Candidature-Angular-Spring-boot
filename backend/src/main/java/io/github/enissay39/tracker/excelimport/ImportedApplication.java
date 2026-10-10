package io.github.enissay39.tracker.excelimport;

import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;

/**
 * Candidature lue dans le classeur : son numéro, ses champs, et la ligne Excel d'où elle vient.
 */
record ImportedApplication(int row, int number, JobApplicationRequest request) {
}

package io.github.enissay39.tracker.excelimport;

import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;

/**
 * Piste lue dans le classeur ; {@code discardReason} n'est renseigné que pour une piste écartée.
 */
record ImportedLead(JobLeadRequest request, String discardReason) {
}

package io.github.enissay39.tracker.joblead.dto;

import java.time.Instant;

import io.github.enissay39.tracker.joblead.LeadState;

/**
 * Piste telle que l'API la renvoie ; {@code discardReason} n'est renseigné que pour une piste écartée.
 */
public record JobLeadResponse(Long id, String company, String jobTitle, String plannedCv, String remark,
		String discardReason, LeadState state, Instant createdAt, Instant updatedAt) {
}

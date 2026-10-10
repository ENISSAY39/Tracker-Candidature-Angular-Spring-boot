package io.github.enissay39.tracker.joblead;

import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;

final class JobLeadMapper {

	private JobLeadMapper() {
	}

	static JobLeadResponse toResponse(JobLead lead) {
		return new JobLeadResponse(lead.getId(), lead.getCompany(), lead.getJobTitle(), lead.getPlannedCv(),
				lead.getRemark(), lead.getDiscardReason(), lead.getState(), lead.getCreatedAt(), lead.getUpdatedAt());
	}

}

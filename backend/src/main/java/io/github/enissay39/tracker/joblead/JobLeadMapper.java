package io.github.enissay39.tracker.joblead;

import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;

final class JobLeadMapper {

	private JobLeadMapper() {
	}

	static JobLeadResponse toResponse(JobLead lead) {
		return new JobLeadResponse(lead.getId(), lead.getCompany(), lead.getJobTitle(), lead.getPlannedCv(),
				lead.getRemark(), lead.getDiscardReason(), lead.getState(), lead.getCreatedAt(), lead.getUpdatedAt());
	}

	/**
	 * Candidature « À envoyer » issue d'une piste : CV prévu → CV envoyé, remarque → notes ; sans date d'envoi.
	 */
	static JobApplicationRequest toApplicationRequest(JobLead lead, String groupName) {
		return new JobApplicationRequest(groupName, lead.getCompany(), lead.getJobTitle(), ApplicationStatus.TO_SEND,
				null, null, null, lead.getRemark(), null, null, lead.getPlannedCv());
	}

}

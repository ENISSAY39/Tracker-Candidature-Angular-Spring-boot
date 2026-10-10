package io.github.enissay39.tracker.jobapplication;

import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;

final class JobApplicationMapper {

	private JobApplicationMapper() {
	}

	static JobApplicationResponse toResponse(JobApplication application) {
		CompanyGroup group = application.getCompanyGroup();
		return new JobApplicationResponse(application.getId(), application.getNumber(), group.getId(),
				group.getName(), application.getCompany(), application.getJobTitle(), application.getStatus(),
				application.getSentOn(), application.getDeadlineLabel(), application.getDeadlineDate(),
				application.getNotes(), application.getStartPeriod(), application.getChannel(),
				application.getCvSent(), application.getCreatedAt(), application.getUpdatedAt());
	}

}

package io.github.enissay39.tracker.jobapplication.dto;

import java.time.Instant;
import java.time.LocalDate;

import io.github.enissay39.tracker.jobapplication.ApplicationStatus;

public record JobApplicationResponse(Long id, Integer number, Long groupId, String groupName, String company,
		String jobTitle, ApplicationStatus status, LocalDate sentOn, String deadlineLabel, LocalDate deadlineDate,
		String notes, String startPeriod, String channel, String cvSent, Instant createdAt, Instant updatedAt) {
}

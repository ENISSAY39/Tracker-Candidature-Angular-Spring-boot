package io.github.enissay39.tracker.jobapplication;

import io.github.enissay39.tracker.jobapplication.dto.StatusCategoryResponse;
import io.github.enissay39.tracker.jobapplication.dto.StatusResponse;

final class StatusMapper {

	private StatusMapper() {
	}

	// order : rang à partir de 1, dans l'ordre de déclaration de l'enum
	static StatusResponse toResponse(ApplicationStatus status) {
		return new StatusResponse(status.name(), status.getLabel(), status.ordinal() + 1,
				toResponse(status.getCategory()));
	}

	private static StatusCategoryResponse toResponse(StatusCategory category) {
		return new StatusCategoryResponse(category.name(), category.getLabel(), category.ordinal() + 1);
	}

}

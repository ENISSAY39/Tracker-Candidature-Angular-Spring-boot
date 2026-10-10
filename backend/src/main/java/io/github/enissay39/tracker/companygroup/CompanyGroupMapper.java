package io.github.enissay39.tracker.companygroup;

import io.github.enissay39.tracker.companygroup.dto.CompanyGroupResponse;

final class CompanyGroupMapper {

	private CompanyGroupMapper() {
	}

	static CompanyGroupResponse toResponse(CompanyGroup group) {
		return new CompanyGroupResponse(group.getId(), group.getName());
	}

}

package io.github.enissay39.tracker.companygroup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Renommage d'un groupe.
 */
public record CompanyGroupRequest(@NotBlank @Size(max = 100) String name) {
}

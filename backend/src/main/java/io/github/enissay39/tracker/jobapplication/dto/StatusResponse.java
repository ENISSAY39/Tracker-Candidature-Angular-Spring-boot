package io.github.enissay39.tracker.jobapplication.dto;

public record StatusResponse(String code, String label, int order, StatusCategoryResponse category) {
}

package io.github.enissay39.tracker.jobapplication;

import java.util.Arrays;
import java.util.List;

import io.github.enissay39.tracker.jobapplication.dto.StatusResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/statuses")
public class StatusController {

	@GetMapping
	public List<StatusResponse> list() {
		return Arrays.stream(ApplicationStatus.values()).map(StatusMapper::toResponse).toList();
	}

}

package io.github.enissay39.tracker.jobapplication;

import java.net.URI;
import java.util.List;

import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

	private final JobApplicationService service;

	public JobApplicationController(JobApplicationService service) {
		this.service = service;
	}

	@GetMapping
	public List<JobApplicationResponse> list() {
		return service.findAll();
	}

	@GetMapping("/{id}")
	public JobApplicationResponse get(@PathVariable Long id) {
		return service.findById(id);
	}

	@PostMapping
	public ResponseEntity<JobApplicationResponse> create(@Valid @RequestBody JobApplicationRequest request) {
		JobApplicationResponse created = service.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{id}")
			.buildAndExpand(created.id())
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

}

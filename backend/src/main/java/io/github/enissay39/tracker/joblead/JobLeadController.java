package io.github.enissay39.tracker.joblead;

import java.util.List;

import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leads")
public class JobLeadController {

	private final JobLeadService service;

	public JobLeadController(JobLeadService service) {
		this.service = service;
	}

	/**
	 * Toutes les pistes, ou celles d'un état ; un état inconnu donne un 400.
	 */
	@GetMapping
	public List<JobLeadResponse> list(@RequestParam(required = false) LeadState state) {
		return service.findAll(state);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public JobLeadResponse create(@Valid @RequestBody JobLeadRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public JobLeadResponse update(@PathVariable Long id, @Valid @RequestBody JobLeadRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}

}

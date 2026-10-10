package io.github.enissay39.tracker.companygroup;

import java.util.List;

import io.github.enissay39.tracker.companygroup.dto.CompanyGroupRequest;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class CompanyGroupController {

	private final CompanyGroupService service;

	public CompanyGroupController(CompanyGroupService service) {
		this.service = service;
	}

	@GetMapping
	public List<CompanyGroupResponse> list() {
		return service.findAll();
	}

	@PutMapping("/{id}")
	public CompanyGroupResponse rename(@PathVariable Long id, @Valid @RequestBody CompanyGroupRequest request) {
		return service.rename(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}

}

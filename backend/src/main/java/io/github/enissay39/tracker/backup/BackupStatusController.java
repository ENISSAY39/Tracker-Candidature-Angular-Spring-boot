package io.github.enissay39.tracker.backup;

import io.github.enissay39.tracker.backup.dto.BackupStatusResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backup")
public class BackupStatusController {

	private final BackupStatusService service;

	public BackupStatusController(BackupStatusService service) {
		this.service = service;
	}

	@GetMapping("/status")
	public BackupStatusResponse status() {
		return service.status();
	}

}

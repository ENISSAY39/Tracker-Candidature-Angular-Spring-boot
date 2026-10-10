package io.github.enissay39.tracker.backup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;

import io.github.enissay39.tracker.backup.dto.BackupStatusResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(BackupStatusController.class)
class BackupStatusControllerTest {

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private BackupStatusService service;

	@Test
	void statusGivesTheTimeOfTheMostRecentBackup() {
		when(service.status()).thenReturn(new BackupStatusResponse(true, Instant.parse("2026-10-09T12:32:05Z")));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": true, "lastBackupAt": "2026-10-09T12:32:05Z"}
				""");
	}

	@Test
	void statusGivesNoTimeWithoutAnyBackup() {
		when(service.status()).thenReturn(new BackupStatusResponse(true, null));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": true, "lastBackupAt": null}
				""");
	}

	@Test
	void statusIsNotAnErrorWhenTheDirectoryIsUnavailable() {
		when(service.status()).thenReturn(new BackupStatusResponse(false, null));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": false, "lastBackupAt": null}
				""");
	}

}

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
		when(service.status()).thenReturn(new BackupStatusResponse(true, Instant.parse("2026-10-09T12:32:05Z"), false, false));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": true, "lastBackupAt": "2026-10-09T12:32:05Z", "lastAttemptFailed": false, "required": false}
				""");
	}

	@Test
	void statusSaysWhenTheLastAttemptFailed() {
		when(service.status()).thenReturn(new BackupStatusResponse(true, Instant.parse("2026-10-09T12:32:05Z"), true, false));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": true, "lastBackupAt": "2026-10-09T12:32:05Z", "lastAttemptFailed": true, "required": false}
				""");
	}

	@Test
	void statusGivesNoTimeWithoutAnyBackup() {
		when(service.status()).thenReturn(new BackupStatusResponse(true, null, false, false));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": true, "lastBackupAt": null, "lastAttemptFailed": false, "required": false}
				""");
	}

	@Test
	void statusIsNotAnErrorWhenTheDirectoryIsUnavailable() {
		when(service.status()).thenReturn(new BackupStatusResponse(false, null, false, false));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": false, "lastBackupAt": null, "lastAttemptFailed": false, "required": false}
				""");
	}

	@Test
	void statusSaysWhenTheFolderIsRequiredAndUnreadable() {
		when(service.status()).thenReturn(new BackupStatusResponse(false, null, false, true));

		assertThat(mvc.get().uri("/api/backup/status")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"available": false, "lastBackupAt": null, "lastAttemptFailed": false, "required": true}
				""");
	}

}

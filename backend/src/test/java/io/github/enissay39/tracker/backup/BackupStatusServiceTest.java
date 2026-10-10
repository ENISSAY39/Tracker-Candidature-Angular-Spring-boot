package io.github.enissay39.tracker.backup;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;

import io.github.enissay39.tracker.backup.dto.BackupStatusResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class BackupStatusServiceTest {

	@TempDir
	private Path directory;

	@Test
	void givesTheTimeOfTheMostRecentBackup() throws IOException {
		backup("tracker-2026-10-08_0900.sql", "2026-10-08T07:00:12Z");
		backup("tracker-2026-10-09_1432.sql", "2026-10-09T12:32:05Z");
		backup("tracker-2026-10-07_2317.sql", "2026-10-07T21:17:40Z");

		assertThat(status()).isEqualTo(new BackupStatusResponse(true, Instant.parse("2026-10-09T12:32:05Z")));
	}

	@Test
	void countsABackupNamedToTheSecond() throws IOException {
		backup("tracker-2026-10-09_1432.sql", "2026-10-09T12:32:05Z");
		backup("tracker-2026-10-09_143257.sql", "2026-10-09T12:32:57Z");

		assertThat(status().lastBackupAt()).isEqualTo(Instant.parse("2026-10-09T12:32:57Z"));
	}

	@Test
	void ignoresEveryFileThatIsNotACompleteBackup() throws IOException {
		backup("tracker-2026-10-08_0900.sql", "2026-10-08T07:00:00Z");
		backup(".tracker-2026-10-09_1432.sql.42.partial", "2026-10-09T12:32:00Z");
		backup(".last-backup-failed", "2026-10-09T12:33:00Z");
		backup("notes-fictives.sql", "2026-10-09T12:34:00Z");
		Files.createDirectory(directory.resolve("tracker-2026-10-09_1500.sql"));

		assertThat(status().lastBackupAt()).isEqualTo(Instant.parse("2026-10-08T07:00:00Z"));
	}

	@Test
	void reportsNoBackupInAnEmptyDirectory() {
		assertThat(status()).isEqualTo(new BackupStatusResponse(true, null));
	}

	@Test
	void isUnavailableWhenTheDirectoryIsMissing() {
		BackupStatusService service = new BackupStatusService(directory.resolve("absent").toString());

		assertThat(service.status()).isEqualTo(new BackupStatusResponse(false, null));
	}

	@Test
	void isUnavailableWhenThePathIsNotADirectory() throws IOException {
		Path file = Files.createFile(directory.resolve("fichier-fictif"));

		assertThat(new BackupStatusService(file.toString()).status()).isEqualTo(new BackupStatusResponse(false, null));
	}

	private BackupStatusResponse status() {
		return new BackupStatusService(directory.toString()).status();
	}

	private void backup(String name, String modifiedAt) throws IOException {
		Path file = Files.createFile(directory.resolve(name));
		Files.setLastModifiedTime(file, FileTime.from(Instant.parse(modifiedAt)));
	}

}

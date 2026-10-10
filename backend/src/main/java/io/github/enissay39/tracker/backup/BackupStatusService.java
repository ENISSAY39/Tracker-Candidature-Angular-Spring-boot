package io.github.enissay39.tracker.backup;

import java.io.IOException;
import java.nio.file.DirectoryIteratorException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.regex.Pattern;

import io.github.enissay39.tracker.backup.dto.BackupStatusResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Lit le dossier où le service {@code backup} de Compose écrit ses sauvegardes. Lecture seule : ne sauvegarde,
 * ne restaure et n'écrit jamais rien.
 */
@Service
public class BackupStatusService {

	// Noms écrits par scripts/backup.sh : tracker-AAAA-MM-JJ_HHMM.sql, ou …_HHMMSS.sql quand la minute est prise
	private static final Pattern BACKUP_FILE_NAME = Pattern
		.compile("tracker-[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}([0-9]{2})?[.]sql");

	private static final BackupStatusResponse UNAVAILABLE = new BackupStatusResponse(false, null, false);

	// Posé par scripts/backup.sh après un échec, retiré après une sauvegarde réussie
	private static final String FAILURE_MARKER = ".last-backup-failed";

	private final Path directory;

	public BackupStatusService(@Value("${tracker.backup.directory}") String directory) {
		this.directory = Path.of(directory);
	}

	/**
	 * Date de modification de la sauvegarde la plus récente, comme le {@code healthcheck} du service
	 * {@code backup} : le nom du fichier porte une heure locale, sans fuseau. La dernière tentative a échoué quand
	 * le marqueur d'échec est présent. Un dossier absent ou illisible donne un état indisponible, jamais une erreur.
	 */
	public BackupStatusResponse status() {
		if (!Files.isDirectory(directory)) {
			return UNAVAILABLE;
		}
		Instant latest = null;
		try (DirectoryStream<Path> files = Files.newDirectoryStream(directory, "tracker-*.sql")) {
			for (Path file : files) {
				Instant modifiedAt = backupTime(file);
				if (modifiedAt != null && (latest == null || modifiedAt.isAfter(latest))) {
					latest = modifiedAt;
				}
			}
		}
		catch (IOException | DirectoryIteratorException | SecurityException ex) {
			return UNAVAILABLE;
		}
		return new BackupStatusResponse(true, latest, Files.exists(directory.resolve(FAILURE_MARKER)));
	}

	private static Instant backupTime(Path file) {
		if (!BACKUP_FILE_NAME.matcher(file.getFileName().toString()).matches()) {
			return null;
		}
		try {
			BasicFileAttributes attributes = Files.readAttributes(file, BasicFileAttributes.class);
			return attributes.isRegularFile() ? attributes.lastModifiedTime().toInstant().truncatedTo(ChronoUnit.SECONDS)
					: null;
		}
		catch (IOException ex) {
			// Fichier supprimé par la rétention entre le parcours du dossier et sa lecture
			return null;
		}
	}

}

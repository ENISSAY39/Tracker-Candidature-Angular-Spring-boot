package io.github.enissay39.tracker.backup.dto;

import java.time.Instant;

/**
 * État des sauvegardes : {@code available} est faux quand le dossier est absent ou illisible (on ne sait rien),
 * {@code lastBackupAt} est nul quand le dossier ne contient aucune sauvegarde.
 */
public record BackupStatusResponse(boolean available, Instant lastBackupAt) {
}

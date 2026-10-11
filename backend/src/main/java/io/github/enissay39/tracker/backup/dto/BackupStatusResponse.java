package io.github.enissay39.tracker.backup.dto;

import java.time.Instant;

/**
 * État des sauvegardes : {@code available} est faux quand le dossier est absent ou illisible (on ne sait rien),
 * {@code lastBackupAt} est nul quand le dossier ne contient aucune sauvegarde, {@code lastAttemptFailed} est vrai
 * quand la dernière tentative de sauvegarde a échoué, {@code required} est vrai quand le dossier doit être lisible
 * (conteneur) : l'absence du dossier est alors une panne de la surveillance, pas un simple dev local.
 */
public record BackupStatusResponse(boolean available, Instant lastBackupAt, boolean lastAttemptFailed,
		boolean required) {
}

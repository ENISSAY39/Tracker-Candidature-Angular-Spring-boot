import { addDays, toDay } from '../../shared/dates';

/** État des sauvegardes, calqué sur `BackupStatusResponse`. */
export interface BackupStatus {
  /** Faux quand le dossier des sauvegardes est absent ou illisible côté serveur : on ne sait rien. */
  available: boolean;
  /** Instant ISO 8601 de la sauvegarde la plus récente ; `null` si le dossier n'en contient aucune. */
  lastBackupAt: string | null;
}

/** Alerte sur les sauvegardes : la plus récente est trop ancienne, il n'y en a aucune, ou rien à signaler. */
export type BackupAlert = 'stale' | 'missing' | 'none';

// Même seuil que le healthcheck du service backup
const STALE_AFTER_HOURS = 48;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

/**
 * Alerte à l'instant `now` (fourni par l'appelant). Aucune alerte quand l'état est inconnu (`null`) ou le
 * dossier indisponible : en dev local, le backend ne voit pas forcément les sauvegardes.
 */
export function backupAlert(status: BackupStatus | null, now: Date): BackupAlert {
  if (status === null || !status.available) {
    return 'none';
  }
  if (status.lastBackupAt === null) {
    return 'missing';
  }
  return now.getTime() - new Date(status.lastBackupAt).getTime() > STALE_AFTER_MS
    ? 'stale'
    : 'none';
}

/** Texte de l'indicateur, en heure locale : « Dernière sauvegarde : hier 14:32 ». */
export function backupLabel(status: BackupStatus | null, now: Date): string {
  if (status === null || !status.available) {
    return 'Sauvegarde : état indisponible';
  }
  if (status.lastBackupAt === null) {
    return 'Aucune sauvegarde';
  }
  const label = `Dernière sauvegarde : ${dayAndTime(new Date(status.lastBackupAt), now)}`;
  // L'alerte ne repose pas sur la couleur seule (WCAG 1.4.1)
  return backupAlert(status, now) === 'stale' ? `${label} (plus de ${STALE_AFTER_HOURS} h)` : label;
}

function dayAndTime(date: Date, now: Date): string {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const day = toDay(date);
  const today = toDay(now);
  if (day === today) {
    return `aujourd’hui ${time}`;
  }
  if (day === addDays(today, -1)) {
    return `hier ${time}`;
  }
  return `${day.split('-').reverse().join('/')} ${time}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

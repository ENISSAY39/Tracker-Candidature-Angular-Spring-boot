import { addDays, toDay } from '../../shared/dates';

/** État des sauvegardes, calqué sur `BackupStatusResponse`. */
export interface BackupStatus {
  /** Faux quand le dossier des sauvegardes est absent ou illisible côté serveur : on ne sait rien. */
  available: boolean;
  /** Instant ISO 8601 de la sauvegarde la plus récente ; `null` si le dossier n'en contient aucune. */
  lastBackupAt: string | null;
  /** Vrai quand la dernière tentative de sauvegarde a échoué, quel que soit l'âge de la dernière réussie. */
  lastAttemptFailed: boolean;
  /** Vrai en conteneur : un dossier indisponible y signale un montage cassé, pas un simple dev local. */
  required: boolean;
}

/**
 * Alerte sur les sauvegardes : le dossier est illisible alors qu'il est requis, la dernière tentative a échoué, la
 * plus récente est trop ancienne, il n'y en a aucune, ou rien à signaler. Un échec prime sur les autres alertes.
 */
export type BackupAlert = 'unreadable' | 'failed' | 'stale' | 'missing' | 'none';

// Même seuil que le healthcheck du service backup
const STALE_AFTER_HOURS = 48;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

const FAILED_NOTE = 'dernière tentative en échec';

/**
 * Alerte à l'instant `now` (fourni par l'appelant). Un dossier indisponible n'alerte que s'il est requis (en
 * conteneur) : en dev local, le backend ne voit pas forcément les sauvegardes. Aucune alerte non plus quand l'état
 * est inconnu (`null`), l'intercepteur affichant déjà l'erreur de l'appel.
 */
export function backupAlert(status: BackupStatus | null, now: Date): BackupAlert {
  if (status === null) {
    return 'none';
  }
  if (!status.available) {
    return status.required ? 'unreadable' : 'none';
  }
  if (status.lastAttemptFailed) {
    return 'failed';
  }
  if (status.lastBackupAt === null) {
    return 'missing';
  }
  return isStale(status.lastBackupAt, now) ? 'stale' : 'none';
}

/** Texte de l'indicateur, en heure locale : « Dernière sauvegarde : hier 14:32 ». */
export function backupLabel(status: BackupStatus | null, now: Date): string {
  if (status !== null && !status.available && status.required) {
    return 'Sauvegardes illisibles';
  }
  if (status === null || !status.available) {
    return 'Sauvegarde : état indisponible';
  }
  // L'alerte ne repose pas sur la couleur seule (WCAG 1.4.1) : sa raison est écrite entre parenthèses
  const notes = status.lastAttemptFailed ? [FAILED_NOTE] : [];
  if (status.lastBackupAt === null) {
    return withNotes('Aucune sauvegarde', notes);
  }
  if (isStale(status.lastBackupAt, now)) {
    notes.unshift(`plus de ${STALE_AFTER_HOURS} h`);
  }
  return withNotes(
    `Dernière sauvegarde : ${dayAndTime(new Date(status.lastBackupAt), now)}`,
    notes,
  );
}

/**
 * Texte à annoncer aux lecteurs d'écran après une lecture, selon l'alerte précédente (`null` à la première lecture).
 * Seuls le passage en alerte et le retour à la normale sont annoncés, jamais le libellé au chargement : chaîne vide
 * à la première lecture, `null` quand rien ne change (l'annonce déjà faite reste en place).
 */
export function backupAnnouncement(
  previouslyInAlert: boolean | null,
  inAlert: boolean,
  label: string,
): string | null {
  if (previouslyInAlert === null) {
    return '';
  }
  if (previouslyInAlert === inAlert) {
    return null;
  }
  return inAlert ? `Alerte sauvegarde : ${label}` : 'Sauvegarde : retour à la normale';
}

function isStale(lastBackupAt: string, now: Date): boolean {
  return now.getTime() - new Date(lastBackupAt).getTime() > STALE_AFTER_MS;
}

function withNotes(label: string, notes: string[]): string {
  return notes.length === 0 ? label : `${label} (${notes.join(', ')})`;
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

import { addDays, compareDates } from './dates';

/** Niveau d'alerte d'une échéance : dépassée, proche (d'aujourd'hui à J+3) ou aucune. */
export type DeadlineAlert = 'overdue' | 'soon' | 'none';

const SOON_DAYS = 3;

/**
 * Alerte d'une date d'échéance par rapport à `today` (`yyyy-MM-dd`, fournie par l'appelant). Aucune alerte sur
 * une candidature close ni sans date.
 */
export function deadlineAlert(
  deadlineDate: string | null,
  closed: boolean,
  today: string,
): DeadlineAlert {
  if (closed || deadlineDate === null) {
    return 'none';
  }
  if (compareDates(deadlineDate, today) < 0) {
    return 'overdue';
  }
  return compareDates(deadlineDate, addDays(today, SOON_DAYS)) <= 0 ? 'soon' : 'none';
}

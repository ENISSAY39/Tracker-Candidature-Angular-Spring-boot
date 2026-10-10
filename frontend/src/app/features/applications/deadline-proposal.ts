import { addDays } from '../../shared/dates';

/** Règle de relance du classeur : échéance proposée à la date d'envoi + 14 jours. */
const FOLLOW_UP_DAYS = 14;

/**
 * Échéance à afficher après la saisie de la date d'envoi : celle déjà renseignée est gardée ; sinon, sur un statut
 * non clos, la date d'envoi + 14 jours.
 */
export function proposeDeadline(
  sentOn: string | null,
  deadlineDate: string | null,
  closed: boolean,
): string | null {
  if (deadlineDate !== null) {
    return deadlineDate;
  }
  return sentOn === null || closed ? null : addDays(sentOn, FOLLOW_UP_DAYS);
}

import { Status } from '../../shared/status';
import { JobApplication } from './application';

/**
 * Faut-il demander la date d'envoi avant de changer de statut ? Seulement si le nouveau statut l'exige (selon l'API
 * des statuts) et que la candidature n'en a pas encore.
 */
export function needsSentOnDialog(application: JobApplication, status: Status): boolean {
  return status.requiresSentOn && application.sentOn === null;
}

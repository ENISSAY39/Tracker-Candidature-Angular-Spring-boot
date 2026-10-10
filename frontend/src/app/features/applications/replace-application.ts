import { JobApplication } from './application';

/** Liste où la candidature de même identifiant est remplacée par celle renvoyée par le serveur. */
export function replaceApplication(
  applications: readonly JobApplication[],
  updated: JobApplication,
): JobApplication[] {
  return applications.map((application) => (application.id === updated.id ? updated : application));
}

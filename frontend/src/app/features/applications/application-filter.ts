import { deadlineAlert } from '../../shared/deadline-alert';
import { isClosed, Status, StatusCategoryCode } from '../../shared/status';
import { JobApplication } from './application';

/** Choix de la liste déroulante des statuts : une catégorie entière ou un seul statut. */
export type StatusChoice =
  { kind: 'category'; code: StatusCategoryCode } | { kind: 'status'; code: string };

export interface ApplicationFilter {
  statusChoice: StatusChoice | null;
  groupId: number | null;
  /** Texte cherché dans l'entreprise, le poste et les notes, sans casse ni accents. */
  text: string;
  /** Seulement les échéances dépassées ou sous trois jours (jamais une candidature close). */
  deadlineAlertOnly: boolean;
}

export const NO_FILTER: ApplicationFilter = {
  statusChoice: null,
  groupId: null,
  text: '',
  deadlineAlertOnly: false,
};

/** Candidatures qui satisfont tous les critères du filtre ; `today` au format `yyyy-MM-dd`. */
export function filterApplications(
  applications: readonly JobApplication[],
  statuses: readonly Status[],
  filter: ApplicationFilter,
  today: string,
): JobApplication[] {
  const statusByCode = new Map(statuses.map((status) => [status.code, status]));
  const searched = normalize(filter.text.trim());
  return applications.filter((application) => {
    const status = statusByCode.get(application.status);
    return (
      matchesStatus(application, status, filter.statusChoice) &&
      (filter.groupId === null || application.groupId === filter.groupId) &&
      (searched === '' || searchableText(application).includes(searched)) &&
      (!filter.deadlineAlertOnly || hasDeadlineAlert(application, status, today))
    );
  });
}

function matchesStatus(
  application: JobApplication,
  status: Status | undefined,
  choice: StatusChoice | null,
): boolean {
  if (choice === null) {
    return true;
  }
  return choice.kind === 'status'
    ? application.status === choice.code
    : status?.category.code === choice.code;
}

function hasDeadlineAlert(
  application: JobApplication,
  status: Status | undefined,
  today: string,
): boolean {
  const closed = status !== undefined && isClosed(status);
  return deadlineAlert(application.deadlineDate, closed, today) !== 'none';
}

function searchableText(application: JobApplication): string {
  return normalize([application.company, application.jobTitle, application.notes ?? ''].join('\n'));
}

// Minuscules sans accents : « Évaluation » et « evaluation » se trouvent l'un l'autre
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

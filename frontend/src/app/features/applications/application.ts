/** Types calqués sur les réponses de l'API (`JobApplicationResponse`, `StatusResponse`). Dates en `yyyy-MM-dd`. */

/** Catégorie de statut : un compteur et une couleur de badge par catégorie. */
export type StatusCategoryCode =
  'OFFER' | 'INTERVIEW' | 'OPENED' | 'PENDING' | 'TO_SEND' | 'REJECTED' | 'WITHDRAWN';

export interface StatusCategory {
  code: StatusCategoryCode;
  label: string;
  order: number;
}

export interface Status {
  code: string;
  label: string;
  order: number;
  category: StatusCategory;
}

export interface JobApplication {
  id: number;
  number: number;
  groupId: number;
  groupName: string;
  company: string;
  jobTitle: string;
  /** Code du statut (`Status.code`). */
  status: string;
  sentOn: string | null;
  deadlineLabel: string | null;
  deadlineDate: string | null;
  notes: string | null;
  startPeriod: string | null;
  channel: string | null;
  cvSent: string | null;
  createdAt: string;
  updatedAt: string;
}

const CLOSED_CATEGORIES: ReadonlySet<StatusCategoryCode> = new Set(['REJECTED', 'WITHDRAWN']);

/** Statut clos (refus, abandonnée) : plus d'échéance, ligne grisée, aucune alerte. */
export function isClosed(status: Status): boolean {
  return CLOSED_CATEGORIES.has(status.category.code);
}

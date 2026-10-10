/** Types calqués sur `StatusResponse` de l'API : libellés, catégories et ordres viennent du backend. */

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

const CLOSED_CATEGORIES: ReadonlySet<StatusCategoryCode> = new Set(['REJECTED', 'WITHDRAWN']);

/** Statut clos (refus, abandonnée) : plus d'échéance, ligne grisée, aucune alerte. */
export function isClosed(status: Status): boolean {
  return CLOSED_CATEGORIES.has(status.category.code);
}

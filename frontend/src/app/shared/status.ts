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
  /** La candidature doit avoir une date d'envoi (tous les statuts sauf « À envoyer » et « Abandonnée »). */
  requiresSentOn: boolean;
  /** Statut clos (refus, abandonnée) : plus d'échéance, ligne grisée, aucune alerte. */
  closed: boolean;
  category: StatusCategory;
}

/** Statut clos selon l'API : plus d'échéance, ligne grisée, aucune alerte. */
export function isClosed(status: Status): boolean {
  return status.closed;
}

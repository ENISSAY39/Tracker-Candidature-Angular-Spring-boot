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

/** Statuts d'une catégorie, pour les listes groupées. */
export interface StatusGroup {
  category: StatusCategory;
  statuses: Status[];
}

/** Statuts regroupés par catégorie, dans l'ordre reçu de l'API. */
export function groupByCategory(statuses: readonly Status[]): StatusGroup[] {
  const groups = new Map<StatusCategoryCode, StatusGroup>();
  for (const status of statuses) {
    const group = groups.get(status.category.code) ?? { category: status.category, statuses: [] };
    group.statuses.push(status);
    groups.set(status.category.code, group);
  }
  return [...groups.values()];
}

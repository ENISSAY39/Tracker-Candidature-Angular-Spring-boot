/** Types calqués sur `JobLeadResponse` et `JobLeadRequest` de l'API. */

/** État d'une piste : à évaluer ou écartée. */
export type LeadState = 'TO_EVALUATE' | 'DISCARDED';

export interface JobLead {
  id: number;
  company: string;
  jobTitle: string;
  plannedCv: string | null;
  remark: string | null;
  /** Motif, renseigné seulement pour une piste écartée. */
  discardReason: string | null;
  state: LeadState;
  createdAt: string;
  updatedAt: string;
}

/** Corps de création et de modification ; ni l'état ni le motif n'en font partie. */
export interface JobLeadRequest {
  company: string;
  jobTitle: string;
  plannedCv: string | null;
  remark: string | null;
}

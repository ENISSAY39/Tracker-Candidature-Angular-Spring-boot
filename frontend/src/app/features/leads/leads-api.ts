import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { JobLead, JobLeadRequest } from './lead';

@Service()
export class LeadsApi {
  private readonly http = inject(HttpClient);

  /** Toutes les pistes, à évaluer et écartées, par date de création. */
  list(): Observable<JobLead[]> {
    return this.http.get<JobLead[]>('/api/leads');
  }

  /** Une piste créée est toujours à évaluer. */
  create(request: JobLeadRequest): Observable<JobLead> {
    return this.http.post<JobLead>('/api/leads', request);
  }

  /** Modifie les textes ; l'état et le motif ne changent pas. */
  update(id: number, request: JobLeadRequest): Observable<JobLead> {
    return this.http.put<JobLead>(`/api/leads/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/leads/${id}`);
  }
}

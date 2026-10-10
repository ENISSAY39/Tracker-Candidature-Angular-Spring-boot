import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Status } from '../../shared/status';
import { CompanyGroup, JobApplication, JobApplicationRequest } from './application';

@Service()
export class ApplicationsApi {
  private readonly http = inject(HttpClient);

  // Les statuts ne changent pas pendant la session : une seule requête, partagée
  private readonly statuses$ = this.http.get<Status[]>('/api/statuses').pipe(shareReplay(1));

  list(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>('/api/applications');
  }

  get(id: number): Observable<JobApplication> {
    return this.http.get<JobApplication>(`/api/applications/${id}`);
  }

  create(request: JobApplicationRequest): Observable<JobApplication> {
    return this.http.post<JobApplication>('/api/applications', request);
  }

  update(id: number, request: JobApplicationRequest): Observable<JobApplication> {
    return this.http.put<JobApplication>(`/api/applications/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/applications/${id}`);
  }

  /** Groupes triés par nom, pour l'autocomplétion. */
  groups(): Observable<CompanyGroup[]> {
    return this.http.get<CompanyGroup[]>('/api/groups');
  }

  /** Statuts dans l'ordre du classeur, avec libellé et catégorie. */
  statuses(): Observable<Status[]> {
    return this.statuses$;
  }
}

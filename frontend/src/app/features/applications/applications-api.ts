import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Status } from '../../shared/status';
import { JobApplication } from './application';

@Service()
export class ApplicationsApi {
  private readonly http = inject(HttpClient);

  // Les statuts ne changent pas pendant la session : une seule requête, partagée
  private readonly statuses$ = this.http.get<Status[]>('/api/statuses').pipe(shareReplay(1));

  list(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>('/api/applications');
  }

  /** Statuts dans l'ordre du classeur, avec libellé et catégorie. */
  statuses(): Observable<Status[]> {
    return this.statuses$;
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { CompanyGroup } from '../applications/application';

@Service()
export class GroupsApi {
  private readonly http = inject(HttpClient);

  /** Groupes triés par nom (sans tenir compte de la casse), groupes vides compris. */
  list(): Observable<CompanyGroup[]> {
    return this.http.get<CompanyGroup[]>('/api/groups');
  }
}

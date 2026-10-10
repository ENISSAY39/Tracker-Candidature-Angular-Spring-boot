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

  /** Nouveau nom, nettoyé par le serveur ; 409 si un autre groupe le porte déjà (sans tenir compte de la casse). */
  rename(id: number, name: string): Observable<CompanyGroup> {
    return this.http.put<CompanyGroup>(`/api/groups/${id}`, { name });
  }

  /** 409 si le groupe a encore des candidatures. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/groups/${id}`);
  }
}

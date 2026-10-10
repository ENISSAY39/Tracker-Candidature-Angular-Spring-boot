import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportResult } from './import-result';

@Service()
export class ImportApi {
  private readonly http = inject(HttpClient);

  /**
   * Envoie le classeur en multipart (champ `file`). Sans remplacement, une base qui contient déjà des candidatures
   * est refusée (409) ; avec, candidatures, pistes et groupes sont remplacés par ceux du classeur.
   */
  importWorkbook(file: File, replace: boolean): Observable<ImportResult> {
    const body = new FormData();
    body.append('file', file);
    const params = replace ? new HttpParams().set('mode', 'replace') : new HttpParams();
    return this.http.post<ImportResult>('/api/import/excel', body, { params });
  }
}

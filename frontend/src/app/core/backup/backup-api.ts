import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BackupStatus } from './backup-status';

@Service()
export class BackupApi {
  private readonly http = inject(HttpClient);

  /** Date de la sauvegarde la plus récente ; jamais d'erreur pour un dossier absent (`available: false`). */
  status(): Observable<BackupStatus> {
    return this.http.get<BackupStatus>('/api/backup/status');
  }
}

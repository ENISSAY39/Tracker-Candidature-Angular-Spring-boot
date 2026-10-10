import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BackupApi } from './backup-api';
import { BackupStatus } from './backup-status';

describe('BackupApi', () => {
  let api: BackupApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(BackupApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads the backup status with GET /api/backup/status', async () => {
    const status: BackupStatus = {
      available: true,
      lastBackupAt: '2026-10-09T12:32:05Z',
      lastAttemptFailed: false,
    };
    const result = firstValueFrom(api.status());

    const request = backend.expectOne('/api/backup/status');
    expect(request.request.method).toBe('GET');
    request.flush(status);

    expect(await result).toEqual(status);
  });
});

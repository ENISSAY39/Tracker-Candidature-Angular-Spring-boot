import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupIndicator } from './backup-indicator';

describe('BackupIndicator', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<BackupIndicator>;
  let indicator: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 10, 16, 0) });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BackupIndicator);
    indicator = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    backend.verify();
    vi.useRealTimers();
  });

  function respond(body: object): void {
    backend.expectOne('/api/backup/status').flush(body);
    fixture.detectChanges();
  }

  it('shows the last backup without alert, as a status for screen readers', () => {
    respond({
      available: true,
      lastBackupAt: new Date(2026, 9, 9, 14, 32).toISOString(),
      lastAttemptFailed: false,
    });

    expect(indicator.textContent?.trim()).toBe('Dernière sauvegarde : hier 14:32');
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.classList).not.toContain('alert');
  });

  it('is in alert when the last backup is too old', () => {
    respond({
      available: true,
      lastBackupAt: new Date(2026, 9, 7, 23, 17).toISOString(),
      lastAttemptFailed: false,
    });

    expect(indicator.textContent?.trim()).toBe(
      'Dernière sauvegarde : 07/10/2026 23:17 (plus de 48 h)',
    );
    expect(indicator.classList).toContain('alert');
  });

  it('is in alert as soon as the last attempt failed, then back to normal', () => {
    const lastBackupAt = new Date(2026, 9, 9, 14, 32).toISOString();
    respond({ available: true, lastBackupAt, lastAttemptFailed: true });

    expect(indicator.textContent?.trim()).toBe(
      'Dernière sauvegarde : hier 14:32 (dernière tentative en échec)',
    );
    expect(indicator.classList).toContain('alert');

    vi.advanceTimersByTime(60 * 60 * 1000);
    respond({ available: true, lastBackupAt, lastAttemptFailed: false });

    expect(indicator.textContent?.trim()).toBe('Dernière sauvegarde : hier 14:32');
    expect(indicator.classList).not.toContain('alert');
  });

  it('is in alert without any backup', () => {
    respond({ available: true, lastBackupAt: null, lastAttemptFailed: false });

    expect(indicator.textContent?.trim()).toBe('Aucune sauvegarde');
    expect(indicator.classList).toContain('alert');
  });

  it('says the status is unavailable, without alert, when the folder cannot be read', () => {
    respond({ available: false, lastBackupAt: null, lastAttemptFailed: false });

    expect(indicator.textContent?.trim()).toBe('Sauvegarde : état indisponible');
    expect(indicator.classList).not.toContain('alert');
  });

  it('says the status is unavailable, without alert, when the API fails', () => {
    backend
      .expectOne('/api/backup/status')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(indicator.textContent?.trim()).toBe('Sauvegarde : état indisponible');
    expect(indicator.classList).not.toContain('alert');
  });

  it('reads the status again every hour', () => {
    respond({
      available: true,
      lastBackupAt: new Date(2026, 9, 9, 14, 32).toISOString(),
      lastAttemptFailed: false,
    });

    vi.advanceTimersByTime(60 * 60 * 1000);
    respond({
      available: true,
      lastBackupAt: new Date(2026, 9, 10, 16, 30).toISOString(),
      lastAttemptFailed: false,
    });

    expect(indicator.textContent?.trim()).toBe('Dernière sauvegarde : aujourd’hui 16:30');
  });
});

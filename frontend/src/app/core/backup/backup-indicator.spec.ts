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
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const label = () => indicator.querySelector('.label')?.textContent?.trim();
  const announcement = () => indicator.querySelector('[role="status"]')?.textContent?.trim();

  function respond(body: object): void {
    backend.expectOne('/api/backup/status').flush(body);
    fixture.detectChanges();
  }

  /** Relecture horaire, suivie de la réponse de l'API. */
  function refresh(body: object): void {
    vi.advanceTimersByTime(60 * 60 * 1000);
    respond(body);
  }

  function setVisibility(state: 'visible' | 'hidden'): void {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    document.dispatchEvent(new Event('visibilitychange'));
  }

  const fresh = () => ({
    available: true,
    lastBackupAt: new Date(2026, 9, 9, 14, 32).toISOString(),
    lastAttemptFailed: false,
    required: false,
  });

  it('shows the last backup without alert', () => {
    respond(fresh());

    expect(label()).toBe('Dernière sauvegarde : hier 14:32');
    expect(indicator.classList).not.toContain('alert');
  });

  it('is in alert when the last backup is too old', () => {
    respond({ ...fresh(), lastBackupAt: new Date(2026, 9, 7, 23, 17).toISOString() });

    expect(label()).toBe('Dernière sauvegarde : 07/10/2026 23:17 (plus de 48 h)');
    expect(indicator.classList).toContain('alert');
  });

  it('is in alert as soon as the last attempt failed, then back to normal', () => {
    respond({ ...fresh(), lastAttemptFailed: true });

    expect(label()).toBe('Dernière sauvegarde : hier 14:32 (dernière tentative en échec)');
    expect(indicator.classList).toContain('alert');

    refresh(fresh());

    expect(label()).toBe('Dernière sauvegarde : hier 14:32');
    expect(indicator.classList).not.toContain('alert');
  });

  it('is in alert without any backup', () => {
    respond({ ...fresh(), lastBackupAt: null });

    expect(label()).toBe('Aucune sauvegarde');
    expect(indicator.classList).toContain('alert');
  });

  it('says the status is unavailable, without alert, when the folder cannot be read in local dev', () => {
    respond({ available: false, lastBackupAt: null, lastAttemptFailed: false, required: false });

    expect(label()).toBe('Sauvegarde : état indisponible');
    expect(indicator.classList).not.toContain('alert');
  });

  it('is in alert, naming the problem, when the required folder cannot be read', () => {
    respond({ available: false, lastBackupAt: null, lastAttemptFailed: false, required: true });

    expect(label()).toBe('Sauvegardes illisibles');
    expect(indicator.classList).toContain('alert');
  });

  it('says the status is unavailable, without alert, when the API fails', () => {
    backend
      .expectOne('/api/backup/status')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(label()).toBe('Sauvegarde : état indisponible');
    expect(indicator.classList).not.toContain('alert');
  });

  it('reads the status again every hour', () => {
    respond(fresh());

    refresh({ ...fresh(), lastBackupAt: new Date(2026, 9, 10, 16, 30).toISOString() });

    expect(label()).toBe('Dernière sauvegarde : aujourd’hui 16:30');
  });

  describe('when the tab becomes visible again', () => {
    it('reads the status again: the day label and the alert are up to date', () => {
      respond(fresh());
      expect(label()).toBe('Dernière sauvegarde : hier 14:32');

      // Le poste se réveille deux jours plus tard : la sauvegarde d'hier a plus de 48 h
      vi.setSystemTime(new Date(2026, 9, 12, 16, 0));
      setVisibility('visible');
      respond(fresh());

      expect(label()).toBe('Dernière sauvegarde : 09/10/2026 14:32 (plus de 48 h)');
      expect(indicator.classList).toContain('alert');
    });

    it('does not read the status when the tab is hidden', () => {
      respond(fresh());

      setVisibility('hidden');

      backend.expectNone('/api/backup/status');
    });
  });

  describe('for screen readers', () => {
    it('does not announce the label when the app loads, whether in alert or not', () => {
      respond({ ...fresh(), lastAttemptFailed: true });

      expect(label()).toContain('dernière tentative en échec');
      expect(indicator.querySelector('[role="status"]')).not.toBeNull();
      expect(announcement()).toBe('');
    });

    it('announces the switch to alert while the app is open', () => {
      respond(fresh());
      expect(announcement()).toBe('');

      refresh({ ...fresh(), lastAttemptFailed: true });

      expect(announcement()).toBe(
        'Alerte sauvegarde : Dernière sauvegarde : hier 14:32 (dernière tentative en échec)',
      );
    });

    it('announces the return to normal', () => {
      respond({ ...fresh(), lastAttemptFailed: true });

      refresh(fresh());

      expect(announcement()).toBe('Sauvegarde : retour à la normale');
    });

    it('empties the announcement after a few seconds, so that browsing does not read it', () => {
      respond(fresh());
      refresh({ ...fresh(), lastAttemptFailed: true });
      expect(announcement()).not.toBe('');

      vi.advanceTimersByTime(10_000);
      fixture.detectChanges();

      expect(announcement()).toBe('');
    });

    it('announces nothing again while the alert state does not change', () => {
      respond(fresh());
      refresh({ ...fresh(), lastAttemptFailed: true });
      vi.advanceTimersByTime(10_000);

      refresh({ ...fresh(), lastAttemptFailed: true, lastBackupAt: null });

      expect(announcement()).toBe('');
    });

    it('announces no return to normal when the API fails while in alert', () => {
      respond({ ...fresh(), lastAttemptFailed: true });

      vi.advanceTimersByTime(60 * 60 * 1000);
      backend
        .expectOne('/api/backup/status')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(label()).toBe('Sauvegarde : état indisponible');
      expect(announcement()).toBe('');

      // La reprise de l'API, toujours en alerte, n'annonce rien non plus : l'alerte n'avait pas cessé
      refresh({ ...fresh(), lastAttemptFailed: true });
      expect(announcement()).toBe('');
    });
  });
});

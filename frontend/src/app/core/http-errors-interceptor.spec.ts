import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { httpErrorsInterceptor } from './http-errors-interceptor';

describe('httpErrorsInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    snackBar.open.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorsInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('shows the detail of a ProblemDetail and rethrows the error', () => {
    let received: unknown;
    http.get('/api/applications/42').subscribe({ error: (error) => (received = error) });

    backend
      .expectOne('/api/applications/42')
      .flush(
        { status: 404, title: 'Ressource introuvable', detail: 'Candidature 42 introuvable.' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(snackBar.open).toHaveBeenCalledWith('Candidature 42 introuvable.', 'Fermer', {
      duration: 5000,
    });
    expect(received).toMatchObject({ status: 404 });
  });

  it('shows a generic message when the server cannot be reached', () => {
    let received: unknown;
    http.get('/api/applications').subscribe({ error: (error) => (received = error) });

    backend.expectOne('/api/applications').error(new ProgressEvent('error'));

    expect(snackBar.open).toHaveBeenCalledWith(
      'Le serveur est injoignable. Vérifiez que l’API est démarrée.',
      'Fermer',
      { duration: 5000 },
    );
    expect(received).toMatchObject({ status: 0 });
  });

  it('shows a generic message when the error has no detail', () => {
    http.get('/api/applications').subscribe({ error: () => undefined });

    backend
      .expectOne('/api/applications')
      .flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(snackBar.open).toHaveBeenCalledWith('Une erreur est survenue.', 'Fermer', {
      duration: 5000,
    });
  });

  it('stays silent on a successful response', () => {
    http.get('/api/applications').subscribe();

    backend.expectOne('/api/applications').flush([]);

    expect(snackBar.open).not.toHaveBeenCalled();
  });
});

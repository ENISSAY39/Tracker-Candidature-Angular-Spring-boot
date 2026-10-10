import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Status } from '../../../shared/status';
import { JobApplication } from '../application';
import { APPLICATIONS_ROUTES } from '../applications.routes';
import { ApplicationDetail } from './application-detail';

const STATUSES: Status[] = [
  {
    code: 'PENDING',
    label: 'En attente',
    order: 7,
    requiresSentOn: true,

    closed: false,

    category: { code: 'PENDING', label: 'En attente', order: 4 },
  },
];

const APPLICATION: JobApplication = {
  id: 5,
  number: 26,
  groupId: 3,
  groupName: 'Groupe Fictif',
  company: 'Fictif Aéro - Bureau d’études, Ville-Test',
  jobTitle: 'Stagiaire ingénieur logiciel (réf. TEST-001)',
  status: 'PENDING',
  sentOn: '2026-10-04',
  deadlineLabel: 'Relance le 18/10',
  deadlineDate: '2026-10-18',
  notes: '04/10 : candidature déposée.\nÀ relancer si pas de réponse.',
  startPeriod: 'Févr. 2027, 6 mois',
  channel: 'Site carrière',
  cvSent: 'CV_Test.pdf, LM_Test.pdf',
  createdAt: '2026-10-04T08:00:00Z',
  updatedAt: '2026-10-04T08:00:00Z',
};

describe('ApplicationDetail', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  let dialogs: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'applications', children: APPLICATIONS_ROUTES }],
          withComponentInputBinding(),
        ),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    dialogs = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
  });

  afterEach(() => backend.verify());

  async function open(id: number, response: JobApplication | null): Promise<HTMLElement> {
    const navigation = harness.navigateByUrl(`/applications/${id}`, ApplicationDetail);
    // La route est chargée à la demande : les requêtes partent un peu plus tard
    (await vi.waitFor(() => backend.expectOne('/api/statuses'))).flush(STATUSES);
    const request = await vi.waitFor(() => backend.expectOne(`/api/applications/${id}`));
    if (response) {
      request.flush(response);
    } else {
      request.flush(
        { status: 404, detail: `Candidature ${id} introuvable.` },
        { status: 404, statusText: 'Not Found' },
      );
    }
    await navigation;
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  }

  const field = (page: HTMLElement, label: string) =>
    Array.from(page.querySelectorAll('dt'))
      .find((dt) => dt.textContent?.trim() === label)
      ?.nextElementSibling?.textContent?.trim();

  it('shows every field, with the status badge and the deadline cell', async () => {
    const page = await open(5, APPLICATION);

    expect(page.querySelector('h1')?.textContent).toContain('N° 26');
    expect(field(page, 'Groupe')).toBe('Groupe Fictif');
    expect(field(page, 'Entreprise')).toBe('Fictif Aéro - Bureau d’études, Ville-Test');
    expect(field(page, 'Poste')).toBe('Stagiaire ingénieur logiciel (réf. TEST-001)');
    expect(page.querySelector('app-status-badge')?.textContent?.trim()).toBe('En attente');
    expect(field(page, 'Envoyée le')).toBe('04/10/2026');
    expect(field(page, 'Échéance')).toBe('Relance le 18/10');
    expect(page.querySelector('app-deadline-cell')?.textContent?.trim()).toContain('18/10/2026');
    expect(field(page, 'Début')).toBe('Févr. 2027, 6 mois');
    expect(field(page, 'Canal')).toBe('Site carrière');
    expect(field(page, 'CV envoyé')).toBe('CV_Test.pdf, LM_Test.pdf');
  });

  it('shows the whole notes with their line breaks', async () => {
    const page = await open(5, APPLICATION);

    const notes = page.querySelector<HTMLElement>('.notes');
    expect(notes?.textContent).toBe('04/10 : candidature déposée.\nÀ relancer si pas de réponse.');
  });

  it('says so with a link to the list when the application does not exist', async () => {
    const page = await open(42, null);

    expect(page.textContent).toContain('Candidature introuvable');
    expect(page.querySelector('a[href="/applications"]')).not.toBeNull();
  });

  it('deletes the application once confirmed, then goes back to the list', async () => {
    await open(5, APPLICATION);
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getContentText()).toContain('n° 26');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    // Le dialogue se ferme avant que la suppression parte
    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/applications'));
    expect(document.body.textContent).toContain('Candidature n° 26 supprimée.');
    // La liste rechargée après le retour
    (await vi.waitFor(() => backend.expectOne('/api/applications'))).flush([]);
  });

  it('keeps the application when the deletion is cancelled', async () => {
    await open(5, APPLICATION);
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Annuler' }))).click();
    await harness.fixture.whenStable();

    backend.expectNone({ method: 'DELETE' });
    expect(TestBed.inject(Router).url).toBe('/applications/5');
  });
});

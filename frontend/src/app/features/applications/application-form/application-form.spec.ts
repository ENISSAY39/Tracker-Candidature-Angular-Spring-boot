import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
} from '@angular/material/core';
import { MatDatepickerInputHarness } from '@angular/material/datepicker/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FrenchDateAdapter } from '../../../core/french-date-adapter';
import { Status } from '../../../shared/status';
import { JobApplication } from '../application';
import { APPLICATIONS_ROUTES } from '../applications.routes';
import { ApplicationForm } from './application-form';

registerLocaleData(localeFr);

function status(
  code: string,
  label: string,
  category: Status['category']['code'],
  rank: number,
): Status {
  return {
    code,
    label,
    order: rank,
    requiresSentOn: code !== 'TO_SEND' && code !== 'WITHDRAWN',
    closed: code === 'REJECTED' || code === 'WITHDRAWN',
    category: { code: category, label, order: rank },
  };
}

const STATUSES: Status[] = [
  status('PENDING', 'En attente', 'PENDING', 4),
  status('TO_SEND', 'À envoyer', 'TO_SEND', 5),
  status('REJECTED', 'Refus', 'REJECTED', 6),
];

const EXISTING: JobApplication = {
  id: 5,
  number: 26,
  groupId: 3,
  groupName: 'Groupe Fictif',
  company: 'Fictif Aéro',
  jobTitle: 'Stagiaire ingénieur logiciel',
  status: 'PENDING',
  sentOn: '2026-10-04',
  deadlineLabel: 'Relance le 18/10',
  deadlineDate: '2026-10-18',
  notes: '04/10 : déposée.',
  startPeriod: null,
  channel: 'Site carrière',
  cvSent: null,
  createdAt: '2026-10-04T08:00:00Z',
  updatedAt: '2026-10-04T08:00:00Z',
};

describe('ApplicationForm', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'applications', children: APPLICATIONS_ROUTES }],
          withComponentInputBinding(),
        ),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
        { provide: DateAdapter, useClass: FrenchDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  });

  afterEach(() => backend.verify());

  async function open(url: string, existing?: JobApplication): Promise<HTMLElement> {
    const navigation = harness.navigateByUrl(url, ApplicationForm);
    (await vi.waitFor(() => backend.expectOne('/api/statuses'))).flush(STATUSES);
    (await vi.waitFor(() => backend.expectOne('/api/groups'))).flush([
      { id: 3, name: 'Groupe Fictif' },
      { id: 4, name: 'Autre Groupe' },
    ]);
    (await vi.waitFor(() => backend.expectOne('/api/applications'))).flush([
      EXISTING,
      { ...EXISTING, id: 6, channel: 'JobTeaser' },
      { ...EXISTING, id: 7, channel: null },
    ]);
    if (existing) {
      (await vi.waitFor(() => backend.expectOne(`/api/applications/${existing.id}`))).flush(
        existing,
      );
    }
    await navigation;
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  }

  const byLabel = async (label: string) =>
    loader.getHarness(MatInputHarness.with({ selector: `[aria-label="${label}"]` }));
  const date = (label: string) =>
    loader.getHarness(MatDatepickerInputHarness.with({ selector: `[aria-label="${label}"]` }));

  async function fillRequired(): Promise<void> {
    await (await byLabel('Groupe')).setValue('Nouveau Groupe');
    await (await byLabel('Entreprise')).setValue(' Fictif Spatial ');
    await (await byLabel('Poste')).setValue('Stagiaire DevOps');
  }

  async function chooseStatus(label: string): Promise<void> {
    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: label });
  }

  const save = async () =>
    (await loader.getHarness(MatButtonHarness.with({ text: 'Enregistrer' }))).click();

  it('creates an application to send without a sent date, then opens its detail page', async () => {
    const page = await open('/applications/new');
    expect(page.querySelector('h1')?.textContent).toContain('Nouvelle candidature');
    await fillRequired();

    await save();
    const request = await vi.waitFor(() => backend.expectOne('/api/applications'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      groupName: 'Nouveau Groupe',
      company: 'Fictif Spatial',
      jobTitle: 'Stagiaire DevOps',
      status: 'TO_SEND',
      sentOn: null,
      deadlineLabel: null,
      deadlineDate: null,
      notes: null,
      startPeriod: null,
      channel: null,
      cvSent: null,
    });
    request.flush({ ...EXISTING, id: 9, number: 27 });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/applications/9'));
    expect(document.body.textContent).toContain('Candidature n° 27 créée.');
    (await vi.waitFor(() => backend.expectOne('/api/applications/9'))).flush(EXISTING);
  });

  it('requires a sent date for a status that needs one', async () => {
    const page = await open('/applications/new');
    await fillRequired();
    await chooseStatus('En attente');

    await save();
    await harness.fixture.whenStable();

    expect(page.textContent).toContain('La date d’envoi est obligatoire pour ce statut.');
    backend.expectNone('/api/applications');
  });

  it('proposes the deadline 14 days after the sent date, without overwriting a filled one', async () => {
    await open('/applications/new');
    await chooseStatus('En attente');

    await (await date('Envoyée le')).setValue('04/10/2026');
    await (await date('Envoyée le')).blur();
    expect(await (await date('Date échéance')).getValue()).toBe('18/10/2026');

    await (await date('Date échéance')).setValue('30/10/2026');
    await (await date('Envoyée le')).setValue('06/10/2026');
    await (await date('Envoyée le')).blur();
    expect(await (await date('Date échéance')).getValue()).toBe('30/10/2026');
  });

  it('empties and disables the deadline date on a closed status', async () => {
    await open('/applications/new');
    await chooseStatus('En attente');
    await (await date('Date échéance')).setValue('18/10/2026');

    await chooseStatus('Refus');
    await harness.fixture.whenStable();

    expect(await (await date('Date échéance')).getValue()).toBe('');
    expect(await (await date('Date échéance')).isDisabled()).toBe(true);
  });

  it('shows the validation errors of the server under their fields', async () => {
    const page = await open('/applications/new');
    await fillRequired();

    await save();
    (await vi.waitFor(() => backend.expectOne('/api/applications'))).flush(
      {
        status: 400,
        detail: 'Un ou plusieurs champs sont invalides.',
        errors: [{ field: 'company', message: 'la taille doit être comprise entre 0 et 255' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    // L'erreur arrive à la fin de la soumission, après la réponse simulée
    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      const company = page.querySelector('[aria-label="Entreprise"]')?.closest('mat-form-field');
      expect(company?.textContent).toContain('la taille doit être comprise entre 0 et 255');
    });
    expect(TestBed.inject(Router).url).toBe('/applications/new');
  });

  it('edits an existing application, showing its number read-only', async () => {
    const page = await open('/applications/5/edit', EXISTING);
    expect(page.querySelector('h1')?.textContent).toContain('Modifier la candidature n° 26');
    expect(await (await byLabel('Entreprise')).getValue()).toBe('Fictif Aéro');
    expect(await (await date('Envoyée le')).getValue()).toBe('04/10/2026');
    await (await byLabel('Poste')).setValue('Stagiaire data');

    await save();
    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      jobTitle: 'Stagiaire data',
      sentOn: '2026-10-04',
      deadlineDate: '2026-10-18',
      channel: 'Site carrière',
    });
    request.flush({ ...EXISTING, jobTitle: 'Stagiaire data' });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/applications/5'));
    (await vi.waitFor(() => backend.expectOne('/api/applications/5'))).flush(EXISTING);
  });

  it('asks before leaving with unsaved changes', async () => {
    await open('/applications/new');
    await (await byLabel('Entreprise')).setValue('Fictif Spatial');

    const leaving = TestBed.inject(Router).navigateByUrl('/applications');
    // Pas de harnais ici : la navigation suspendue par le garde empêche l'application d'être stable
    const dialog = await vi.waitFor(() => {
      const container = document.querySelector('mat-dialog-container');
      expect(container?.textContent).toContain(
        'Les modifications non enregistrées seront perdues.',
      );
      return container as HTMLElement;
    });
    Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Annuler')
      ?.click();

    expect(await leaving).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/applications/new');
  });
});

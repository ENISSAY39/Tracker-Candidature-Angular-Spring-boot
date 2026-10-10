import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDatepickerInputHarness } from '@angular/material/datepicker/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideFrenchLocale } from '../../../core/french-locale';
import { addDays, today } from '../../../shared/dates';
import { Status, StatusCategoryCode } from '../../../shared/status';
import { JobApplication } from '../application';
import { StatusMenu } from './status-menu';

function status(
  code: string,
  label: string,
  category: StatusCategoryCode,
  rank: number,
  categoryLabel = label,
): Status {
  return {
    code,
    label,
    order: rank,
    requiresSentOn: code !== 'TO_SEND' && code !== 'WITHDRAWN',
    closed: code === 'REJECTED' || code === 'WITHDRAWN',
    category: { code: category, label: categoryLabel, order: rank },
  };
}

const STATUSES: Status[] = [
  status('INTERVIEW', 'Entretien', 'INTERVIEW', 2),
  status('UNDER_REVIEW', 'En examen', 'OPENED', 3, 'Dossier ouvert par le recruteur'),
  status('SELECTION', 'Sélection', 'OPENED', 3, 'Dossier ouvert par le recruteur'),
  status('PENDING', 'En attente', 'PENDING', 4),
  status('TO_SEND', 'À envoyer', 'TO_SEND', 5),
  status('REJECTED', 'Refus', 'REJECTED', 6),
];

function application(sentOn: string | null, statusCode: string): JobApplication {
  return {
    id: 5,
    number: 26,
    groupId: 3,
    groupName: 'Groupe Fictif',
    company: 'Fictif Aéro',
    jobTitle: 'Stagiaire ingénieur logiciel',
    status: statusCode,
    sentOn,
    deadlineLabel: null,
    deadlineDate: null,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-04T08:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z',
  };
}

// Affichage français d'un jour yyyy-MM-dd, tel que le datepicker le montre
const shown = (day: string) => day.split('-').reverse().join('/');

describe('StatusMenu', () => {
  let fixture: ComponentFixture<StatusMenu>;
  let backend: HttpTestingController;
  let loader: HarnessLoader;
  let overlay: HarnessLoader;
  let changed: JobApplication[];

  async function render(current: JobApplication): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFrenchLocale()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StatusMenu);
    fixture.componentRef.setInput('application', current);
    fixture.componentRef.setInput('statuses', STATUSES);
    changed = [];
    fixture.componentInstance.changed.subscribe((updated) => changed.push(updated));
    loader = TestbedHarnessEnvironment.loader(fixture);
    overlay = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  async function choose(label: string): Promise<void> {
    const menu = await loader.getHarness(MatMenuHarness);
    await menu.open();
    await menu.clickItem({ text: label });
  }

  it('shows the current status and lists the statuses, headed by their category when it has several', async () => {
    await render(application('2026-10-04', 'PENDING'));
    const menu = await loader.getHarness(MatMenuHarness);
    expect(await menu.getTriggerText()).toBe('En attente');

    await menu.open();

    expect(await Promise.all((await menu.getItems()).map((item) => item.getText()))).toEqual([
      'Entretien',
      'En examen',
      'Sélection',
      'En attente',
      'À envoyer',
      'Refus',
    ]);
    const headings = Array.from(document.querySelectorAll('.status-menu-category'));
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      'Dossier ouvert par le recruteur',
    ]);
  });

  it('sends the status alone when the application already has a sent date', async () => {
    await render(application('2026-10-04', 'PENDING'));

    await choose('Entretien');
    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5/status'));
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'INTERVIEW' });
    request.flush(application('2026-10-04', 'INTERVIEW'));

    await vi.waitFor(() => expect(changed.map((a) => a.status)).toEqual(['INTERVIEW']));
    expect(document.body.textContent).toContain('Candidature n° 26 : Entretien.');
  });

  it('sends the status alone when the new status needs no sent date', async () => {
    await render(application(null, 'INTERVIEW'));

    await choose('À envoyer');
    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5/status'));
    expect(request.request.body).toEqual({ status: 'TO_SEND' });
    request.flush(application(null, 'TO_SEND'));
  });

  it('asks for the sent date, prefilled to today with the deadline 14 days later, then sends both', async () => {
    await render(application(null, 'TO_SEND'));

    await choose('En attente');
    const dialog = await overlay.getHarness(MatDialogHarness);
    const sentOn = await dialog.getHarness(
      MatDatepickerInputHarness.with({ selector: '[aria-label="Envoyée le"]' }),
    );
    const deadline = await dialog.getHarness(
      MatDatepickerInputHarness.with({ selector: '[aria-label="Date échéance"]' }),
    );
    expect(await sentOn.getValue()).toBe(shown(today()));
    expect(await deadline.getValue()).toBe(shown(addDays(today(), 14)));
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Valider' }))).click();

    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5/status'));
    expect(request.request.body).toEqual({
      status: 'PENDING',
      sentOn: today(),
      deadlineDate: addDays(today(), 14),
    });
    request.flush(application(today(), 'PENDING'));
    await vi.waitFor(() => expect(changed.length).toBe(1));
  });

  it('keeps the deadline the application already has instead of proposing one', async () => {
    await render({ ...application(null, 'TO_SEND'), deadlineDate: '2026-11-30' });

    await choose('En attente');
    const dialog = await overlay.getHarness(MatDialogHarness);
    const deadline = await dialog.getHarness(
      MatDatepickerInputHarness.with({ selector: '[aria-label="Date échéance"]' }),
    );
    expect(await deadline.getValue()).toBe('30/11/2026');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Annuler' }))).click();
  });

  it('proposes no deadline for a closed status', async () => {
    await render(application(null, 'TO_SEND'));

    await choose('Refus');
    const dialog = await overlay.getHarness(MatDialogHarness);
    expect(
      await dialog.getAllHarnesses(
        MatDatepickerInputHarness.with({ selector: '[aria-label="Date échéance"]' }),
      ),
    ).toEqual([]);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Valider' }))).click();

    const request = await vi.waitFor(() => backend.expectOne('/api/applications/5/status'));
    expect(request.request.body).toEqual({ status: 'REJECTED', sentOn: today() });
    request.flush(application(today(), 'REJECTED'));
  });

  it('changes nothing when the dialog is cancelled', async () => {
    await render(application(null, 'TO_SEND'));

    await choose('En attente');
    const dialog = await overlay.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Annuler' }))).click();
    await fixture.whenStable();

    backend.expectNone('/api/applications/5/status');
    expect(changed).toEqual([]);
  });
});

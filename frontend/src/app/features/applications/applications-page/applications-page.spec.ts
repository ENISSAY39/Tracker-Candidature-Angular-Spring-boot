import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addDays, today } from '../../../shared/dates';
import { Status } from '../../../shared/status';
import { JobApplication } from '../application';
import { ApplicationsPage } from './applications-page';

const STATUSES: Status[] = [
  {
    code: 'INTERVIEW',
    label: 'Entretien',
    order: 2,
    category: { code: 'INTERVIEW', label: 'Entretien', order: 2 },
  },
  {
    code: 'PENDING',
    label: 'En attente',
    order: 7,
    category: { code: 'PENDING', label: 'En attente', order: 4 },
  },
  {
    code: 'REJECTED',
    label: 'Refus',
    order: 9,
    category: { code: 'REJECTED', label: 'Refus', order: 6 },
  },
];

function application(number: number, status: string, extra: Partial<JobApplication> = {}) {
  return {
    id: number * 10,
    number,
    groupId: 1,
    groupName: 'Groupe Fictif',
    company: `Fictif ${number}`,
    jobTitle: 'Stagiaire ingénieur logiciel',
    status,
    sentOn: '2026-10-04',
    deadlineLabel: null,
    deadlineDate: null,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-04T08:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z',
    ...extra,
  } satisfies JobApplication;
}

describe('ApplicationsPage', () => {
  let fixture: ComponentFixture<ApplicationsPage>;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApplicationsPage);
    // Pas de whenStable ici : le chargement en cours le bloquerait jusqu'à la réponse simulée
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(page().querySelectorAll('tr.mat-mdc-row'));
  const numbers = () => rows().map((row) => row.querySelector('td')?.textContent?.trim());

  async function respond(applications: JobApplication[]): Promise<void> {
    backend.expectOne('/api/statuses').flush(STATUSES);
    backend.expectOne('/api/applications').flush(applications);
    await fixture.whenStable();
  }

  it('shows a loading indicator until the applications arrive', async () => {
    expect(page().querySelector('[role="progressbar"]')).not.toBeNull();

    await respond([]);

    expect(page().querySelector('[role="progressbar"]')).toBeNull();
  });

  it('says so when there is no application yet', async () => {
    await respond([]);

    expect(page().textContent).toContain('Aucune candidature pour l’instant.');
    expect(page().querySelector('table')).toBeNull();
  });

  it('shows one row per application in the default order, with the columns of the workbook', async () => {
    await respond([
      application(1, 'REJECTED'),
      application(2, 'PENDING', { deadlineDate: '2026-10-20' }),
      application(3, 'INTERVIEW'),
      application(4, 'PENDING', {
        deadlineLabel: 'Relance le 18/10',
        deadlineDate: '2026-10-18',
        notes: '04/10 : candidature déposée.\nÀ relancer si pas de réponse.',
      }),
    ]);

    const headers = Array.from(page().querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual([
      'N°',
      'Groupe',
      'Entreprise',
      'Poste',
      'Statut',
      'Envoyée le',
      'Échéance',
      'Date échéance',
      'Prochaine action',
    ]);
    expect(numbers()).toEqual(['3', '4', '2', '1']);
    const cells = Array.from(rows()[1].querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(cells).toEqual([
      '4',
      'Groupe Fictif',
      'Fictif 4',
      'Stagiaire ingénieur logiciel',
      'En attente',
      '04/10/2026',
      'Relance le 18/10',
      '18/10/2026',
      '04/10 : candidature déposée.\nÀ relancer si pas de réponse.',
    ]);
  });

  it('shows the total then one counter per non-empty category, before the table', async () => {
    await respond([
      application(1, 'REJECTED'),
      application(2, 'PENDING'),
      application(3, 'INTERVIEW'),
      application(4, 'PENDING'),
    ]);

    const counters = Array.from(page().querySelectorAll('.counters li')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(counters).toEqual(['Total 4', 'Entretien 1', 'En attente 2', 'Refus 1']);
  });

  it('highlights an overdue deadline date but not the one of a closed application', async () => {
    const yesterday = addDays(today(), -1);
    await respond([
      application(1, 'PENDING', { deadlineDate: yesterday }),
      application(2, 'REJECTED', { deadlineDate: yesterday }),
    ]);

    const deadlineCells = rows().map((row) => row.querySelector<HTMLElement>('app-deadline-cell'));
    expect(deadlineCells.map((cell) => cell?.style.color)).toEqual(['rgb(192, 0, 0)', '']);
  });

  it('greys out the rows of closed applications', async () => {
    await respond([application(1, 'REJECTED'), application(2, 'PENDING')]);

    expect(rows().map((row) => row.classList.contains('closed'))).toEqual([false, true]);
  });

  it('sorts on a column when its header is clicked, then back to the default order', async () => {
    await respond([
      application(1, 'INTERVIEW'),
      application(2, 'REJECTED'),
      application(3, 'PENDING'),
    ]);
    expect(numbers()).toEqual(['1', '3', '2']);
    const numberHeader = page().querySelector<HTMLElement>('th .mat-sort-header-container');

    numberHeader?.click();
    await fixture.whenStable();
    expect(numbers()).toEqual(['1', '2', '3']);

    numberHeader?.click();
    await fixture.whenStable();
    expect(numbers()).toEqual(['3', '2', '1']);

    numberHeader?.click();
    await fixture.whenStable();
    expect(numbers()).toEqual(['1', '3', '2']);
  });
});

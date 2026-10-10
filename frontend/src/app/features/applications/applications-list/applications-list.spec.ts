import { provideRouter } from '@angular/router';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { addDays, today } from '../../../shared/dates';
import { Status } from '../../../shared/status';
import { JobApplication } from '../application';
import { ApplicationsList } from './applications-list';

const STATUSES: Status[] = [
  {
    code: 'INTERVIEW',
    label: 'Entretien',
    order: 2,
    category: { code: 'INTERVIEW', label: 'Entretien', order: 2 },
  },
  {
    code: 'UNDER_REVIEW',
    label: 'En examen',
    order: 3,
    category: { code: 'OPENED', label: 'Dossier ouvert par le recruteur', order: 3 },
  },
  {
    code: 'SELECTION',
    label: 'Sélection',
    order: 6,
    category: { code: 'OPENED', label: 'Dossier ouvert par le recruteur', order: 3 },
  },
  {
    code: 'PENDING',
    label: 'En attente',
    order: 7,
    category: { code: 'PENDING', label: 'En attente', order: 4 },
  },
];

function application(number: number, extra: Partial<JobApplication> = {}): JobApplication {
  return {
    id: number * 10,
    number,
    groupId: 1,
    groupName: 'Groupe Fictif',
    company: `Fictif ${number}`,
    jobTitle: 'Stagiaire logiciel',
    status: 'PENDING',
    sentOn: '2026-10-01',
    deadlineLabel: null,
    deadlineDate: null,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...extra,
  };
}

const APPLICATIONS = [
  application(1, { status: 'INTERVIEW', groupId: 2, groupName: 'Autre Groupe' }),
  application(2, { status: 'UNDER_REVIEW', company: 'Société Évaluation' }),
  application(3, { status: 'SELECTION', deadlineDate: addDays(today(), -1) }),
  application(4, { status: 'PENDING', groupId: 2, groupName: 'Autre Groupe' }),
];

describe('ApplicationsList', () => {
  let fixture: ComponentFixture<ApplicationsList>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  async function render(showGroupFilter = true): Promise<void> {
    fixture = TestBed.createComponent(ApplicationsList);
    fixture.componentRef.setInput('applications', APPLICATIONS);
    fixture.componentRef.setInput('statuses', STATUSES);
    fixture.componentRef.setInput('showGroupFilter', showGroupFilter);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  }

  const page = () => fixture.nativeElement as HTMLElement;
  const numbers = () =>
    Array.from(page().querySelectorAll('tr.mat-mdc-row')).map((row) =>
      row.querySelector('td')?.textContent?.trim(),
    );
  const counters = () =>
    Array.from(page().querySelectorAll('.counters button')).map((button) =>
      button.textContent?.replace(/\s+/g, ' ').trim(),
    );

  it('filters on a category when its counter is clicked, the counters staying the same', async () => {
    await render();
    const before = counters();
    expect(before).toEqual([
      'Total 4',
      'Entretien 1',
      'Dossier ouvert par le recruteur 2',
      'En attente 1',
    ]);

    page().querySelectorAll<HTMLButtonElement>('.counters button')[2].click();
    await fixture.whenStable();

    expect(numbers()).toEqual(['3', '2']);
    expect(counters()).toEqual(before);
    expect(page().querySelectorAll('.counters button')[2].getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('keeps the select and the counters in step for a category with a single status', async () => {
    await render();
    const select = await loader.getHarness(MatSelectHarness.with({ selector: '.status-filter' }));

    page().querySelectorAll<HTMLButtonElement>('.counters button')[3].click();
    await fixture.whenStable();
    expect(await select.getValueText()).toBe('En attente');
    expect(numbers()).toEqual(['4']);

    await select.open();
    await select.clickOptions({ text: 'Entretien' });
    await fixture.whenStable();
    expect(page().querySelectorAll('.counters button')[1].getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('disables the clear button once nothing is filtered any more', async () => {
    await render();
    const clear = await loader.getHarness(MatButtonHarness.with({ text: 'Effacer les filtres' }));
    const search = await loader.getHarness(MatInputHarness);

    await search.setValue('fictif');
    expect(await clear.isDisabled()).toBe(false);
    await search.setValue('  ');

    expect(await clear.isDisabled()).toBe(true);
  });

  it('offers the statuses grouped by category, and filters on one of them', async () => {
    await render();
    const select = await loader.getHarness(MatSelectHarness.with({ selector: '.status-filter' }));
    await select.open();

    const groups = await select.getOptionGroups();
    expect(await Promise.all(groups.map((group) => group.getLabelText()))).toEqual([
      'Entretien',
      'Dossier ouvert par le recruteur',
      'En attente',
    ]);
    await select.clickOptions({ text: 'Sélection' });
    await fixture.whenStable();

    expect(numbers()).toEqual(['3']);
  });

  it('filters on a group chosen among the groups of the list', async () => {
    await render();
    const select = await loader.getHarness(MatSelectHarness.with({ selector: '.group-filter' }));
    await select.open();

    const options = await select.getOptions();
    expect(await Promise.all(options.map((option) => option.getText()))).toEqual([
      'Tous les groupes',
      'Autre Groupe',
      'Groupe Fictif',
    ]);
    await select.clickOptions({ text: 'Autre Groupe' });
    await fixture.whenStable();

    expect(numbers()).toEqual(['1', '4']);
  });

  it('hides the group filter when asked', async () => {
    await render(false);

    expect(
      await loader.getAllHarnesses(MatSelectHarness.with({ selector: '.group-filter' })),
    ).toEqual([]);
  });

  it('searches a text without case or accents, keeps the deadline alerts, then clears everything', async () => {
    await render();
    const search = await loader.getHarness(MatInputHarness);
    await search.setValue('evaluation');
    await fixture.whenStable();
    expect(numbers()).toEqual(['2']);

    await search.setValue('');
    await (await loader.getHarness(MatSlideToggleHarness)).toggle();
    await fixture.whenStable();
    expect(numbers()).toEqual(['3']);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Effacer les filtres' }))).click();
    await fixture.whenStable();
    expect(numbers()).toEqual(['1', '3', '2', '4']);
  });

  it('says so when no application matches the filters', async () => {
    await render();

    await (await loader.getHarness(MatInputHarness)).setValue('introuvable');
    await fixture.whenStable();

    expect(page().querySelector('[role="status"]')?.textContent).toContain(
      'Aucune candidature ne correspond aux filtres.',
    );
    expect(page().querySelector('table')).toBeNull();
  });
});

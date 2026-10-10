import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Status } from '../../../shared/status';
import { JobApplication } from '../../applications/application';
import { GroupPage } from './group-page';

const STATUSES: Status[] = [
  {
    code: 'INTERVIEW',
    label: 'Entretien',
    order: 2,
    requiresSentOn: true,
    closed: false,
    category: { code: 'INTERVIEW', label: 'Entretien', order: 2 },
  },
  {
    code: 'PENDING',
    label: 'En attente',
    order: 7,
    requiresSentOn: true,
    closed: false,
    category: { code: 'PENDING', label: 'En attente', order: 4 },
  },
];

const GROUPS = [
  { id: 1, name: 'Groupe Fictif' },
  { id: 2, name: 'Groupe Alpha' },
];

function application(number: number, groupId: number, status: string): JobApplication {
  return {
    id: number * 10,
    number,
    groupId,
    groupName: GROUPS.find((group) => group.id === groupId)?.name ?? '',
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
  };
}

describe('GroupPage', () => {
  let fixture: ComponentFixture<GroupPage>;
  let backend: HttpTestingController;

  function open(id: number): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'groups', children: [] }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GroupPage);
    fixture.componentRef.setInput('id', id);
    // Pas de whenStable ici : le chargement en cours le bloquerait jusqu'à la réponse simulée
    fixture.detectChanges();
  }

  afterEach(() => backend.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const numbers = () =>
    Array.from(page().querySelectorAll('tr.mat-mdc-row')).map((row) =>
      row.querySelector('td')?.textContent?.trim(),
    );
  const counters = () =>
    Array.from(page().querySelectorAll('.counters li')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );

  async function respond(applications: JobApplication[]): Promise<void> {
    await vi.waitFor(() => {
      backend.expectOne('/api/groups').flush(GROUPS);
      backend.expectOne('/api/statuses').flush(STATUSES);
      backend.expectOne('/api/applications').flush(applications);
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('mat-progress-bar')).toBeNull();
    });
  }

  it('shows the group name and only the applications of the group, with its counters', async () => {
    open(1);
    await respond([
      application(1, 1, 'PENDING'),
      application(2, 2, 'INTERVIEW'),
      application(3, 1, 'INTERVIEW'),
      application(4, 1, 'PENDING'),
    ]);

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Groupe Fictif');
    expect(numbers()).toEqual(['3', '1', '4']);
    expect(counters()).toEqual(['Total 3', 'Entretien 1', 'En attente 2']);
  });

  it('updates the row and the counters of the group after a quick status change', async () => {
    open(1);
    await respond([application(1, 1, 'PENDING'), application(2, 1, 'PENDING')]);
    const loader = TestbedHarnessEnvironment.loader(fixture);

    const menus = await loader.getAllHarnesses(MatMenuHarness);
    await menus[1].open();
    await menus[1].clickItem({ text: 'Entretien' });
    const request = await vi.waitFor(() => backend.expectOne('/api/applications/20/status'));
    request.flush(application(2, 1, 'INTERVIEW'));

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(numbers()).toEqual(['2', '1']);
      expect(counters()).toEqual(['Total 2', 'Entretien 1', 'En attente 1']);
    });
  });

  it('hides the group filter', async () => {
    open(1);
    await respond([application(1, 1, 'PENDING')]);

    expect(page().querySelector('.group-filter')).toBeNull();
    expect(page().querySelector('.status-filter')).not.toBeNull();
  });

  it('says when the group has no application yet', async () => {
    open(2);
    await respond([application(1, 1, 'PENDING')]);

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Groupe Alpha');
    expect(page().textContent).toContain('Aucune candidature dans ce groupe.');
    expect(page().querySelector('app-applications-list')).toBeNull();
  });

  it('says when the group could not be loaded and links to the list of groups', async () => {
    open(1);
    // L'échec d'un des appels annule les autres
    await vi.waitFor(() => {
      backend.expectOne('/api/statuses');
      backend.expectOne('/api/applications');
      backend.expectOne('/api/groups').flush(null, { status: 500, statusText: 'Erreur' });
    });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('h1')?.textContent?.trim()).toBe('Groupe indisponible');
    });
    expect(page().querySelector('a[href="/groups"]')).not.toBeNull();
  });

  it('says when the group is unknown and links to the list of groups', async () => {
    open(99);
    await respond([application(1, 1, 'PENDING')]);

    expect(page().textContent).toContain('Ce groupe n’existe pas.');
    const link = page().querySelector<HTMLAnchorElement>('a[href="/groups"]');
    expect(link?.textContent?.trim()).toBe('Retour aux groupes');
  });

  it('renames the group: title and group column follow', async () => {
    open(1);
    await respond([application(1, 1, 'PENDING'), application(2, 2, 'PENDING')]);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Renommer' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatInputHarness)).setValue('Groupe Renommé');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Renommer' }))).click();
    (await vi.waitFor(() => backend.expectOne('/api/groups/1'))).flush({
      id: 1,
      name: 'Groupe Renommé',
    });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('h1')?.textContent?.trim()).toBe('Groupe Renommé');
    });
    const groupCells = Array.from(page().querySelectorAll('td.mat-column-groupName'));
    expect(groupCells.map((cell) => cell.textContent?.trim())).toEqual(['Groupe Renommé']);
  });

  it('goes back to the list of groups once the group is deleted', async () => {
    open(2);
    await respond([application(1, 1, 'PENDING')]);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getContentText()).toContain('Groupe Alpha');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    const request = await vi.waitFor(() => backend.expectOne('/api/groups/2'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/groups'));
    expect(document.body.textContent).toContain('Groupe « Groupe Alpha » supprimé.');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { GroupsPage } from './groups-page';

describe('GroupsPage', () => {
  let fixture: ComponentFixture<GroupsPage>;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GroupsPage);
    // Pas de whenStable ici : le chargement en cours le bloquerait jusqu'à la réponse simulée
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const rows = () =>
    Array.from(page().querySelectorAll('tr.mat-mdc-row')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );

  function respond(groups: unknown[], applications: unknown[]): void {
    backend.expectOne('/api/groups').flush(groups);
    backend.expectOne('/api/applications').flush(applications);
  }

  it('lists the groups in the order of the API with their number of applications', async () => {
    respond(
      [
        { id: 2, name: 'Groupe Alpha' },
        { id: 3, name: 'Groupe Bêta' },
        { id: 1, name: 'Groupe Fictif' },
      ],
      [{ groupId: 1 }, { groupId: 2 }, { groupId: 1 }],
    );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(rows()).toEqual([
        ['Groupe Alpha', '1'],
        ['Groupe Bêta', '0'],
        ['Groupe Fictif', '2'],
      ]);
    });
  });

  it('links each group to its page', async () => {
    respond([{ id: 1, name: 'Groupe Fictif' }], []);

    await vi.waitFor(() => {
      fixture.detectChanges();
      const link = page().querySelector<HTMLAnchorElement>('td a');
      expect(link?.getAttribute('href')).toBe('/groups/1');
      expect(link?.textContent?.trim()).toBe('Groupe Fictif');
    });
  });

  it('says when there is no group yet', async () => {
    respond([], []);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().textContent).toContain('Aucun groupe pour l’instant.');
    });
  });

  it('says when the groups could not be loaded', async () => {
    // L'échec d'un des deux appels annule l'autre
    backend.expectOne('/api/applications');
    backend.expectOne('/api/groups').flush(null, { status: 500, statusText: 'Erreur' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().textContent).toContain('La liste des groupes n’a pas pu être chargée.');
    });
  });
});

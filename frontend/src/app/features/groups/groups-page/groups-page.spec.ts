import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
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
      Array.from(row.querySelectorAll('td.mat-column-name, td.mat-column-applicationCount')).map(
        (cell) => cell.textContent?.trim(),
      ),
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

  describe('actions', () => {
    let loader: HarnessLoader;
    let dialogs: HarnessLoader;

    beforeEach(async () => {
      loader = TestbedHarnessEnvironment.loader(fixture);
      dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);
      respond(
        [
          { id: 2, name: 'Groupe Alpha' },
          { id: 1, name: 'Groupe Fictif' },
        ],
        [{ groupId: 1 }],
      );
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(rows().length).toBe(2);
      });
    });

    const button = (label: string) =>
      loader.getHarness(MatButtonHarness.with({ selector: `[aria-label="${label}"]` }));

    it('renames a group from its row', async () => {
      await (await button('Renommer le groupe Groupe Alpha')).click();
      const dialog = await dialogs.getHarness(MatDialogHarness);
      await (await dialog.getHarness(MatInputHarness)).setValue('Groupe Zêta');
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Renommer' }))).click();
      (await vi.waitFor(() => backend.expectOne('/api/groups/2'))).flush({
        id: 2,
        name: 'Groupe Zêta',
      });

      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(rows()).toEqual([
          ['Groupe Fictif', '1'],
          ['Groupe Zêta', '0'],
        ]);
      });
      expect(document.body.textContent).toContain('Groupe renommé en « Groupe Zêta ».');
    });

    it('deletes an empty group once confirmed', async () => {
      await (await button('Supprimer le groupe Groupe Alpha')).click();
      const dialog = await dialogs.getHarness(MatDialogHarness);
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
      const request = await vi.waitFor(() => backend.expectOne('/api/groups/2'));
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });

      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(rows().map((row) => row[0])).toEqual(['Groupe Fictif']);
      });
      expect(document.body.textContent).toContain('Groupe « Groupe Alpha » supprimé.');
    });

    it('says that a group with applications cannot be deleted, and keeps it', async () => {
      await (await button('Supprimer le groupe Groupe Fictif')).click();
      const dialog = await dialogs.getHarness(MatDialogHarness);
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
      (await vi.waitFor(() => backend.expectOne('/api/groups/1'))).flush(
        { status: 409, detail: 'Le groupe « Groupe Fictif » a des candidatures.' },
        { status: 409, statusText: 'Conflict' },
      );

      await vi.waitFor(() =>
        expect(document.body.textContent).toContain(
          'Le groupe « Groupe Fictif » a encore des candidatures : il ne peut pas être supprimé.',
        ),
      );
      fixture.detectChanges();
      expect(rows().map((row) => row[0])).toEqual(['Groupe Alpha', 'Groupe Fictif']);
    });
  });
});

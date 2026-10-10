import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { vi } from 'vitest';
import { CompanyGroup } from '../../applications/application';
import { openRenameGroupDialog } from './rename-group-dialog';

@Component({ template: '' })
class Host {
  readonly dialog = inject(MatDialog);
}

describe('RenameGroupDialog', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;
  let dialogs: HarnessLoader;
  let result: CompanyGroup | undefined | 'pending';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);
    result = 'pending';
    openRenameGroupDialog(fixture.componentInstance.dialog, {
      id: 1,
      name: 'Groupe Fictif',
    }).subscribe((renamed) => (result = renamed));
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const dialog = () => dialogs.getHarness(MatDialogHarness);
  const nameInput = async () =>
    (await dialog()).getHarness(MatInputHarness.with({ selector: '[aria-label="Nom du groupe"]' }));
  const click = async (text: string) =>
    (await (await dialog()).getHarness(MatButtonHarness.with({ text }))).click();

  it('is filled with the current name', async () => {
    expect(await (await dialog()).getTitleText()).toBe('Renommer le groupe');
    expect(await (await nameInput()).getValue()).toBe('Groupe Fictif');
  });

  it('requires a name before sending anything', async () => {
    await (await nameInput()).setValue('');
    await click('Renommer');

    expect(await (await dialog()).getText()).toContain('Le nom est obligatoire.');
    backend.expectNone('/api/groups/1');
  });

  it('sends the new name and closes with the renamed group', async () => {
    await (await nameInput()).setValue(' Groupe Renommé ');
    await click('Renommer');

    const request = await vi.waitFor(() => backend.expectOne('/api/groups/1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Groupe Renommé' });
    request.flush({ id: 1, name: 'Groupe Renommé' });

    await vi.waitFor(() => expect(result).toEqual({ id: 1, name: 'Groupe Renommé' }));
  });

  it('says that the name is taken on a 409 and stays open', async () => {
    await (await nameInput()).setValue('Autre Groupe');
    await click('Renommer');

    (await vi.waitFor(() => backend.expectOne('/api/groups/1'))).flush(
      { status: 409, detail: 'Le groupe « Autre Groupe » existe déjà.' },
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(async () =>
      expect(await (await dialog()).getText()).toContain('Ce nom est déjà pris.'),
    );
    expect(result).toBe('pending');
  });

  it('shows a validation error of the server under the field', async () => {
    await (await nameInput()).setValue('Groupe Renommé');
    await click('Renommer');

    (await vi.waitFor(() => backend.expectOne('/api/groups/1'))).flush(
      {
        status: 400,
        errors: [{ field: 'name', message: 'la taille doit être comprise entre 0 et 100' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await vi.waitFor(async () =>
      expect(await (await dialog()).getText()).toContain(
        'la taille doit être comprise entre 0 et 100',
      ),
    );
    expect(result).toBe('pending');
  });

  it('closes without result when cancelled', async () => {
    await click('Annuler');

    await vi.waitFor(() => expect(result).toBeUndefined());
  });
});

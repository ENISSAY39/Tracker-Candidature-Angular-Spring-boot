import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ImportPage } from './import-page';

describe('ImportPage', () => {
  let fixture: ComponentFixture<ImportPage>;
  let backend: HttpTestingController;
  let loader: HarnessLoader;
  let dialogs: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ImportPage);
    loader = TestbedHarnessEnvironment.loader(fixture);
    dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const importButton = () => loader.getHarness(MatButtonHarness.with({ text: 'Importer' }));

  /** Choix d'un classeur fictif, comme le ferait le sélecteur de fichiers. */
  async function chooseFile(name = 'classeur-fictif.xlsx'): Promise<File> {
    const file = new File(['fictif'], name);
    const input = page().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    return file;
  }

  async function sent(): Promise<TestRequest> {
    return vi.waitFor(() => backend.expectOne((req) => req.url === '/api/import/excel'));
  }

  it('accepts only .xlsx files and cannot send without a file', async () => {
    expect(page().querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.xlsx');
    expect(await (await importButton()).isDisabled()).toBe(true);

    await chooseFile();

    expect(page().textContent).toContain('classeur-fictif.xlsx');
    expect(await (await importButton()).isDisabled()).toBe(false);
  });

  it('shows a progress indicator while sending, then the numbers of created rows', async () => {
    const file = await chooseFile();

    await (await importButton()).click();
    const request = await sent();
    expect(request.request.params.has('mode')).toBe(false);
    expect((request.request.body as FormData).get('file')).toBe(file);
    fixture.detectChanges();
    expect(page().querySelector('mat-progress-bar')).not.toBeNull();
    request.flush({ companyGroups: 2, jobApplications: 5, jobLeads: 3 });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('.result')?.textContent?.replace(/\s+/g, ' ')).toContain(
        '2 groupes, 5 candidatures et 3 pistes créés.',
      );
    });
    expect(page().querySelector('mat-progress-bar')).toBeNull();
    expect(page().querySelector('a[href="/applications"]')?.textContent?.trim()).toBe(
      'Voir les candidatures',
    );
  });

  it('shows the rejection of the server, naming the sheet and the row, in the page', async () => {
    await chooseFile();

    await (await importButton()).click();
    (await sent()).flush(
      {
        status: 400,
        detail:
          'Import refusé : feuille « Toutes les candidatures », ligne 7 : statut « Inconnu » inconnu.',
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await vi.waitFor(() => {
      fixture.detectChanges();
      const alert = page().querySelector('[role="alert"]');
      expect(alert?.textContent).toContain(
        'Import refusé : feuille « Toutes les candidatures », ligne 7 : statut « Inconnu » inconnu.',
      );
    });
  });

  it('explains a refusal because of existing applications and offers to replace them', async () => {
    await chooseFile();

    await (await importButton()).click();
    (await sent()).flush(
      { status: 409, detail: 'La base contient déjà des candidatures.' },
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('[role="alert"]')?.textContent).toContain(
        'La base contient déjà des candidatures',
      );
    });
    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Remplacer les données' }))
    ).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Remplacer' }))).click();

    const request = await sent();
    expect(request.request.params.get('mode')).toBe('replace');
    request.flush({ companyGroups: 1, jobApplications: 1, jobLeads: 0 });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('.result')).not.toBeNull();
    });
  });

  it('asks for confirmation before replacing the existing data', async () => {
    await chooseFile();
    await (await loader.getHarness(MatCheckboxHarness)).check();

    await (await importButton()).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getContentText()).toContain('candidatures, pistes et groupes');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Annuler' }))).click();
    await fixture.whenStable();
    backend.expectNone((req) => req.url === '/api/import/excel');

    await (await importButton()).click();
    await (
      await (
        await dialogs.getHarness(MatDialogHarness)
      ).getHarness(MatButtonHarness.with({ text: 'Remplacer' }))
    ).click();
    const request = await sent();
    expect(request.request.params.get('mode')).toBe('replace');
    request.flush({ companyGroups: 0, jobApplications: 0, jobLeads: 0 });
  });
});

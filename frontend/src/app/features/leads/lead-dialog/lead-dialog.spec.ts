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
import { JobLead } from '../lead';
import { openLeadDialog } from './lead-dialog';

@Component({ template: '' })
class Host {
  readonly dialog = inject(MatDialog);
}

describe('LeadDialog', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;
  let dialogs: HarnessLoader;
  let result: JobLead | undefined | 'pending';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);
    result = 'pending';
    openLeadDialog(fixture.componentInstance.dialog, null).subscribe((saved) => (result = saved));
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const input = async (label: string) =>
    (await dialogs.getHarness(MatDialogHarness)).getHarness(
      MatInputHarness.with({ selector: `[aria-label="${label}"]` }),
    );
  const save = async () =>
    (
      await (
        await dialogs.getHarness(MatDialogHarness)
      ).getHarness(MatButtonHarness.with({ text: 'Enregistrer' }))
    ).click();

  it('requires the company and the job title before sending anything', async () => {
    await save();

    const text = await (await dialogs.getHarness(MatDialogHarness)).getText();
    expect(text).toContain('L’entreprise est obligatoire.');
    expect(text).toContain('Le poste est obligatoire.');
    backend.expectNone('/api/leads');
    expect(result).toBe('pending');
  });

  it('shows the validation errors of the server under their fields and stays open', async () => {
    await (await input('Entreprise')).setValue('Fictif Aéro');
    await (await input('Poste')).setValue('Stagiaire logiciel');
    await save();

    const request = await vi.waitFor(() => backend.expectOne('/api/leads'));
    request.flush(
      {
        status: 400,
        errors: [{ field: 'company', message: 'ne doit pas être vide' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await vi.waitFor(async () => {
      expect(await (await dialogs.getHarness(MatDialogHarness)).getText()).toContain(
        'ne doit pas être vide',
      );
    });
    expect(result).toBe('pending');
  });

  it('closes with the saved lead, empty optional texts sent as null', async () => {
    await (await input('Entreprise')).setValue(' Fictif Aéro ');
    await (await input('Poste')).setValue('Stagiaire logiciel');
    await (await input('CV prévu')).setValue('  ');
    await save();

    const request = await vi.waitFor(() => backend.expectOne('/api/leads'));
    expect(request.request.body).toEqual({
      company: 'Fictif Aéro',
      jobTitle: 'Stagiaire logiciel',
      plannedCv: null,
      remark: null,
    });
    const saved = { id: 4, company: 'Fictif Aéro' } as JobLead;
    request.flush(saved);

    await vi.waitFor(() => expect(result).toEqual(saved));
  });

  it('closes without result when cancelled', async () => {
    await (
      await (
        await dialogs.getHarness(MatDialogHarness)
      ).getHarness(MatButtonHarness.with({ text: 'Annuler' }))
    ).click();

    await vi.waitFor(() => expect(result).toBeUndefined());
  });
});

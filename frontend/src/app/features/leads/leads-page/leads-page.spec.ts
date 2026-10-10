import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { JobLead } from '../lead';
import { LeadsPage } from './leads-page';

function lead(id: number, extra: Partial<JobLead> = {}): JobLead {
  return {
    id,
    company: `Fictif ${id}`,
    jobTitle: 'Stagiaire logiciel',
    plannedCv: null,
    remark: null,
    discardReason: null,
    state: 'TO_EVALUATE',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...extra,
  };
}

const DISCARDED = lead(3, {
  company: 'Fictif Spatial',
  state: 'DISCARDED',
  discardReason: 'Trop loin de Ville-Test',
});

describe('LeadsPage', () => {
  let fixture: ComponentFixture<LeadsPage>;
  let backend: HttpTestingController;
  let loader: HarnessLoader;
  let dialogs: HarnessLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'applications/:id', children: [] }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LeadsPage);
    loader = TestbedHarnessEnvironment.loader(fixture);
    dialogs = TestbedHarnessEnvironment.documentRootLoader(fixture);
    // Pas de whenStable ici : le chargement en cours le bloquerait jusqu'à la réponse simulée
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  // Seul l'onglet actif compte : celui qu'on quitte reste dans le DOM le temps de l'animation
  const activeTab = () => page().querySelector('.mat-mdc-tab-body-active') as HTMLElement;
  const companies = () =>
    Array.from(activeTab().querySelectorAll('tr.mat-mdc-row')).map((row) =>
      row.querySelector('td')?.textContent?.trim(),
    );

  async function respond(leads: JobLead[]): Promise<void> {
    backend.expectOne('/api/leads').flush(leads);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('mat-progress-bar')).toBeNull();
    });
    await fixture.whenStable();
  }

  it('shows two tabs with their number of leads, the leads to evaluate first', async () => {
    await respond([lead(1), DISCARDED, lead(2)]);
    const tabs = await loader.getHarness(MatTabGroupHarness);

    const labels = await Promise.all((await tabs.getTabs()).map((tab) => tab.getLabel()));
    expect(labels).toEqual(['À évaluer (2)', 'Écartées (1)']);
    expect(companies()).toEqual(['Fictif 1', 'Fictif 2']);
  });

  it('shows the reason of the discarded leads in their tab', async () => {
    await respond([lead(1), DISCARDED]);
    const tabs = await loader.getHarness(MatTabGroupHarness);

    await tabs.selectTab({ label: 'Écartées (1)' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(companies()).toEqual(['Fictif Spatial']);
    });
    const headers = Array.from(activeTab().querySelectorAll('th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toContain('Motif');
    expect(page().querySelector('tr.mat-mdc-row')?.textContent).toContain(
      'Trop loin de Ville-Test',
    );
  });

  it('says when a tab has no lead', async () => {
    await respond([]);

    expect(page().textContent).toContain('Aucune piste à évaluer.');
  });

  it('adds a lead to evaluate from a dialog', async () => {
    await respond([lead(1)]);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Nouvelle piste' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('Nouvelle piste');
    await (
      await dialog.getHarness(MatInputHarness.with({ selector: '[aria-label="Entreprise"]' }))
    ).setValue('Fictif Ferroviaire');
    await (
      await dialog.getHarness(MatInputHarness.with({ selector: '[aria-label="Poste"]' }))
    ).setValue('Stagiaire embarqué');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Enregistrer' }))).click();

    const request = await vi.waitFor(() => backend.expectOne('/api/leads'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      company: 'Fictif Ferroviaire',
      jobTitle: 'Stagiaire embarqué',
      plannedCv: null,
      remark: null,
    });
    request.flush(lead(4, { company: 'Fictif Ferroviaire', jobTitle: 'Stagiaire embarqué' }));

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(companies()).toEqual(['Fictif 1', 'Fictif Ferroviaire']);
    });
    expect(document.body.textContent).toContain('Piste ajoutée.');
  });

  it('edits a lead from a dialog filled with its values', async () => {
    await respond([lead(1, { plannedCv: 'CV_Test.pdf', remark: 'Annonce fictive' })]);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Modifier' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('Modifier la piste');
    const remark = await dialog.getHarness(
      MatInputHarness.with({ selector: '[aria-label="Remarque"]' }),
    );
    expect(await remark.getValue()).toBe('Annonce fictive');
    await remark.setValue('Annonce fictive, à relire');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Enregistrer' }))).click();

    const request = await vi.waitFor(() => backend.expectOne('/api/leads/1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      company: 'Fictif 1',
      jobTitle: 'Stagiaire logiciel',
      plannedCv: 'CV_Test.pdf',
      remark: 'Annonce fictive, à relire',
    });
    request.flush(lead(1, { plannedCv: 'CV_Test.pdf', remark: 'Annonce fictive, à relire' }));

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page().querySelector('tr.mat-mdc-row')?.textContent).toContain('à relire');
    });
    expect(document.body.textContent).toContain('Piste modifiée.');
  });

  it('deletes a lead once confirmed', async () => {
    await respond([lead(1), lead(2)]);

    await (await loader.getAllHarnesses(MatButtonHarness.with({ text: 'Supprimer' })))[0].click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    expect(await dialog.getContentText()).toContain('Fictif 1');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();

    const request = await vi.waitFor(() => backend.expectOne('/api/leads/1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(companies()).toEqual(['Fictif 2']);
    });
    expect(document.body.textContent).toContain('Piste supprimée.');
  });

  it('keeps the lead when the deletion is cancelled', async () => {
    await respond([lead(1)]);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Supprimer' }))).click();
    const dialog = await dialogs.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Annuler' }))).click();
    await fixture.whenStable();

    backend.expectNone({ method: 'DELETE' });
    expect(companies()).toEqual(['Fictif 1']);
  });

  describe('gestures', () => {
    const buttonTexts = async () =>
      Promise.all(
        (
          await loader.getAllHarnesses(
            MatButtonHarness.with({ ancestor: '.mat-mdc-tab-body-active tr' }),
          )
        ).map((button) => button.getText()),
      );
    const tabLabels = async () =>
      Promise.all(
        (await (await loader.getHarness(MatTabGroupHarness)).getTabs()).map((tab) =>
          tab.getLabel(),
        ),
      );

    it('offers promote and discard to the leads to evaluate, restore to the discarded ones', async () => {
      await respond([lead(1), DISCARDED]);

      expect(await buttonTexts()).toEqual(['Promouvoir', 'Écarter', 'Modifier', 'Supprimer']);
      await (await loader.getHarness(MatTabGroupHarness)).selectTab({ label: 'Écartées (1)' });
      await vi.waitFor(async () =>
        expect(await buttonTexts()).toEqual(['Réévaluer', 'Modifier', 'Supprimer']),
      );
    });

    it('promotes a lead in a group then opens the created application', async () => {
      await respond([lead(1)]);

      // Clic DOM : le harnais attendrait une stabilité que la requête des groupes, en attente, empêche
      page().querySelector<HTMLButtonElement>('button[aria-label^="Promouvoir"]')?.click();
      (await vi.waitFor(() => backend.expectOne('/api/groups'))).flush([
        { id: 1, name: 'Groupe Fictif' },
      ]);
      const dialog = await dialogs.getHarness(MatDialogHarness);
      expect(await dialog.getTitleText()).toBe('Promouvoir la piste');
      await (
        await dialog.getHarness(MatInputHarness.with({ selector: '[aria-label="Groupe"]' }))
      ).setValue('Groupe Fictif');
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Promouvoir' }))).click();

      const request = await vi.waitFor(() => backend.expectOne('/api/leads/1/promote'));
      expect(request.request.body).toEqual({ groupName: 'Groupe Fictif' });
      request.flush({ id: 30, number: 41 });

      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/applications/30'));
      expect(document.body.textContent).toContain('Piste promue : candidature n° 41 créée.');
    });

    it('requires a group to promote a lead', async () => {
      await respond([lead(1)]);

      // Clic DOM : le harnais attendrait une stabilité que la requête des groupes, en attente, empêche
      page().querySelector<HTMLButtonElement>('button[aria-label^="Promouvoir"]')?.click();
      (await vi.waitFor(() => backend.expectOne('/api/groups'))).flush([]);
      const dialog = await dialogs.getHarness(MatDialogHarness);
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Promouvoir' }))).click();

      expect(await dialog.getText()).toContain('Le groupe est obligatoire.');
      backend.expectNone('/api/leads/1/promote');
    });

    it('discards a lead with a mandatory reason: it moves to the discarded tab', async () => {
      await respond([lead(1), lead(2)]);

      await (await loader.getAllHarnesses(MatButtonHarness.with({ text: 'Écarter' })))[0].click();
      const dialog = await dialogs.getHarness(MatDialogHarness);
      expect(await dialog.getTitleText()).toBe('Écarter la piste');
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Écarter' }))).click();
      expect(await dialog.getText()).toContain('Le motif est obligatoire.');
      backend.expectNone('/api/leads/1/discard');

      await (
        await dialog.getHarness(MatInputHarness.with({ selector: '[aria-label="Motif"]' }))
      ).setValue('Trop loin de Ville-Test');
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Écarter' }))).click();
      const request = await vi.waitFor(() => backend.expectOne('/api/leads/1/discard'));
      expect(request.request.body).toEqual({ reason: 'Trop loin de Ville-Test' });
      request.flush(lead(1, { state: 'DISCARDED', discardReason: 'Trop loin de Ville-Test' }));

      await vi.waitFor(async () => {
        fixture.detectChanges();
        expect(await tabLabels()).toEqual(['À évaluer (1)', 'Écartées (1)']);
      });
      expect(companies()).toEqual(['Fictif 2']);
      expect(document.body.textContent).toContain('Piste écartée.');
      // Le bouton « Écarter » a disparu avec la ligne : le focus repart du titre
      await vi.waitFor(() => expect(document.activeElement).toBe(page().querySelector('h1')));
    });

    it('restores a discarded lead directly: it moves back to the leads to evaluate', async () => {
      await respond([DISCARDED]);
      await (await loader.getHarness(MatTabGroupHarness)).selectTab({ label: 'Écartées (1)' });

      const restore = await vi.waitFor(() =>
        loader.getHarness(MatButtonHarness.with({ text: 'Réévaluer' })),
      );
      await restore.click();
      const request = await vi.waitFor(() => backend.expectOne('/api/leads/3/restore'));
      expect(request.request.method).toBe('POST');
      request.flush({ ...DISCARDED, state: 'TO_EVALUATE', discardReason: null });

      await vi.waitFor(async () => {
        fixture.detectChanges();
        expect(await tabLabels()).toEqual(['À évaluer (1)', 'Écartées (0)']);
      });
      expect(document.body.textContent).toContain('Piste remise à évaluer.');
    });
  });
});

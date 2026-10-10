import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ImportApi } from './import-api';

describe('ImportApi', () => {
  let api: ImportApi;
  let backend: HttpTestingController;
  // Contenu fictif : seul l'envoi est vérifié, jamais la lecture du classeur
  const file = new File(['fictif'], 'classeur-fictif.xlsx');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ImportApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('sends the workbook as multipart field "file" to POST /api/import/excel', async () => {
    const result = firstValueFrom(api.importWorkbook(file, false));

    const request = backend.expectOne((req) => req.url === '/api/import/excel');
    expect(request.request.method).toBe('POST');
    expect(request.request.params.has('mode')).toBe(false);
    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);
    request.flush({ companyGroups: 2, jobApplications: 5, jobLeads: 3 });

    expect(await result).toEqual({ companyGroups: 2, jobApplications: 5, jobLeads: 3 });
  });

  it('adds mode=replace to replace the existing data', async () => {
    const result = firstValueFrom(api.importWorkbook(file, true));

    const request = backend.expectOne((req) => req.url === '/api/import/excel');
    expect(request.request.params.get('mode')).toBe('replace');
    request.flush({ companyGroups: 1, jobApplications: 1, jobLeads: 0 });

    expect(await result).toEqual({ companyGroups: 1, jobApplications: 1, jobLeads: 0 });
  });
});

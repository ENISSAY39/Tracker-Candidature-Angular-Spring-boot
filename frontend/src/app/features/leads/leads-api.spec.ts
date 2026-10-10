import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { JobLead, JobLeadRequest } from './lead';
import { LeadsApi } from './leads-api';

const LEAD: JobLead = {
  id: 4,
  company: 'Fictif Aéro',
  jobTitle: 'Stagiaire logiciel',
  plannedCv: 'CV_Test.pdf',
  remark: null,
  discardReason: null,
  state: 'TO_EVALUATE',
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
};

const REQUEST: JobLeadRequest = {
  company: 'Fictif Aéro',
  jobTitle: 'Stagiaire logiciel',
  plannedCv: 'CV_Test.pdf',
  remark: null,
};

describe('LeadsApi', () => {
  let api: LeadsApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(LeadsApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads every lead with GET /api/leads', async () => {
    const result = firstValueFrom(api.list());

    const request = backend.expectOne('/api/leads');
    expect(request.request.method).toBe('GET');
    request.flush([LEAD]);

    expect(await result).toEqual([LEAD]);
  });

  it('creates a lead with POST /api/leads', async () => {
    const result = firstValueFrom(api.create(REQUEST));

    const request = backend.expectOne('/api/leads');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(REQUEST);
    request.flush(LEAD);

    expect(await result).toEqual(LEAD);
  });

  it('updates a lead with PUT /api/leads/{id}', async () => {
    const result = firstValueFrom(api.update(4, REQUEST));

    const request = backend.expectOne('/api/leads/4');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(REQUEST);
    request.flush(LEAD);

    expect(await result).toEqual(LEAD);
  });

  it('deletes a lead with DELETE /api/leads/{id}', async () => {
    const result = firstValueFrom(api.delete(4));

    const request = backend.expectOne('/api/leads/4');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await result).toBeNull();
  });
});

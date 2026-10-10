import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApplicationsApi } from './applications-api';
import { Status } from '../../shared/status';
import { JobApplication, JobApplicationRequest } from './application';

describe('ApplicationsApi', () => {
  let api: ApplicationsApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApplicationsApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads every application with GET /api/applications', async () => {
    const application: JobApplication = {
      id: 5,
      number: 26,
      groupId: 3,
      groupName: 'Groupe Fictif',
      company: 'Fictif Aéro',
      jobTitle: 'Stagiaire ingénieur logiciel',
      status: 'PENDING',
      sentOn: '2026-10-04',
      deadlineLabel: 'Relance le 18/10',
      deadlineDate: '2026-10-18',
      notes: null,
      startPeriod: null,
      channel: null,
      cvSent: null,
      createdAt: '2026-10-04T08:00:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
    };
    const result = firstValueFrom(api.list());

    const request = backend.expectOne('/api/applications');
    expect(request.request.method).toBe('GET');
    request.flush([application]);

    expect(await result).toEqual([application]);
  });

  it('reads the statuses once with GET /api/statuses and shares them', async () => {
    const statuses: Status[] = [
      {
        code: 'PENDING',
        label: 'En attente',
        order: 7,
        requiresSentOn: true,
        closed: false,
        category: { code: 'PENDING', label: 'En attente', order: 4 },
      },
    ];
    const first = firstValueFrom(api.statuses());
    const second = firstValueFrom(api.statuses());

    const request = backend.expectOne('/api/statuses');
    expect(request.request.method).toBe('GET');
    request.flush(statuses);

    expect(await first).toEqual(statuses);
    expect(await second).toEqual(statuses);
    expect(await firstValueFrom(api.statuses())).toEqual(statuses);
  });

  it('reads one application with GET /api/applications/{id}', async () => {
    const result = firstValueFrom(api.get(5));

    const request = backend.expectOne('/api/applications/5');
    expect(request.request.method).toBe('GET');
    request.flush({ id: 5, number: 26 });

    expect(await result).toMatchObject({ id: 5, number: 26 });
  });

  it('deletes one application with DELETE /api/applications/{id}', async () => {
    const result = firstValueFrom(api.delete(5));

    const request = backend.expectOne('/api/applications/5');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await result).toBeNull();
  });

  const REQUEST: JobApplicationRequest = {
    groupName: 'Groupe Fictif',
    company: 'Fictif Aéro',
    jobTitle: 'Stagiaire ingénieur logiciel',
    status: 'PENDING',
    sentOn: '2026-10-04',
    deadlineLabel: null,
    deadlineDate: '2026-10-18',
    notes: null,
    startPeriod: null,
    channel: 'Site carrière',
    cvSent: null,
  };

  it('creates an application with POST /api/applications', async () => {
    const result = firstValueFrom(api.create(REQUEST));

    const request = backend.expectOne('/api/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(REQUEST);
    request.flush({ id: 9, number: 27 });

    expect(await result).toMatchObject({ id: 9, number: 27 });
  });

  it('replaces every field with PUT /api/applications/{id}', async () => {
    const result = firstValueFrom(api.update(9, REQUEST));

    const request = backend.expectOne('/api/applications/9');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(REQUEST);
    request.flush({ id: 9, number: 27 });

    expect(await result).toMatchObject({ id: 9 });
  });

  it('reads the groups with GET /api/groups', async () => {
    const result = firstValueFrom(api.groups());

    const request = backend.expectOne('/api/groups');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, name: 'Groupe Fictif' }]);

    expect(await result).toEqual([{ id: 1, name: 'Groupe Fictif' }]);
  });

  it('changes the status with PATCH /api/applications/{id}/status', async () => {
    const result = firstValueFrom(
      api.changeStatus(9, { status: 'PENDING', sentOn: '2026-10-04', deadlineDate: '2026-10-18' }),
    );

    const request = backend.expectOne('/api/applications/9/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      status: 'PENDING',
      sentOn: '2026-10-04',
      deadlineDate: '2026-10-18',
    });
    request.flush({ id: 9, status: 'PENDING' });

    expect(await result).toMatchObject({ id: 9, status: 'PENDING' });
  });
});

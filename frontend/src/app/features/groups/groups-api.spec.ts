import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CompanyGroup } from '../applications/application';
import { GroupsApi } from './groups-api';

describe('GroupsApi', () => {
  let api: GroupsApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(GroupsApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads the groups with GET /api/groups', async () => {
    const groups: CompanyGroup[] = [
      { id: 2, name: 'Groupe Alpha' },
      { id: 1, name: 'Groupe Fictif' },
    ];
    const result = firstValueFrom(api.list());

    const request = backend.expectOne('/api/groups');
    expect(request.request.method).toBe('GET');
    request.flush(groups);

    expect(await result).toEqual(groups);
  });
});

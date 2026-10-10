import { Status, StatusCategoryCode } from '../../shared/status';
import { JobApplication } from './application';
import { ApplicationFilter, filterApplications, NO_FILTER } from './application-filter';

function status(code: string, category: StatusCategoryCode, rank: number): Status {
  return {
    code,
    label: code,
    order: rank,
    category: { code: category, label: category, order: rank },
  };
}

const STATUSES: Status[] = [
  status('INTERVIEW', 'INTERVIEW', 2),
  status('UNDER_REVIEW', 'OPENED', 3),
  status('SELECTION', 'OPENED', 3),
  status('PENDING', 'PENDING', 4),
  status('REJECTED', 'REJECTED', 6),
];

const TODAY = '2026-10-10';

function application(number: number, extra: Partial<JobApplication> = {}): JobApplication {
  return {
    id: number,
    number,
    groupId: 1,
    groupName: 'Groupe Fictif',
    company: 'Fictif Aéro',
    jobTitle: 'Stagiaire logiciel',
    status: 'PENDING',
    sentOn: '2026-10-01',
    deadlineLabel: null,
    deadlineDate: null,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...extra,
  };
}

function numbers(applications: JobApplication[], filter: Partial<ApplicationFilter>): number[] {
  return filterApplications(applications, STATUSES, { ...NO_FILTER, ...filter }, TODAY).map(
    (a) => a.number,
  );
}

describe('filterApplications', () => {
  it('keeps everything without any filter', () => {
    expect(numbers([application(1), application(2)], {})).toEqual([1, 2]);
  });

  it('keeps the statuses of a chosen category', () => {
    const applications = [
      application(1, { status: 'UNDER_REVIEW' }),
      application(2, { status: 'PENDING' }),
      application(3, { status: 'SELECTION' }),
    ];

    expect(numbers(applications, { statusChoice: { kind: 'category', code: 'OPENED' } })).toEqual([
      1, 3,
    ]);
  });

  it('keeps a single chosen status', () => {
    const applications = [
      application(1, { status: 'UNDER_REVIEW' }),
      application(2, { status: 'SELECTION' }),
    ];

    expect(numbers(applications, { statusChoice: { kind: 'status', code: 'SELECTION' } })).toEqual([
      2,
    ]);
  });

  it('keeps the applications of a chosen group', () => {
    const applications = [application(1, { groupId: 1 }), application(2, { groupId: 2 })];

    expect(numbers(applications, { groupId: 2 })).toEqual([2]);
  });

  it('searches the company, the job title and the notes, ignoring case and accents', () => {
    const applications = [
      application(1, { company: 'Société Évaluation' }),
      application(2, { jobTitle: 'Stagiaire EVALUATION des risques' }),
      application(3, { notes: '04/10 : entretien d’évaluation prévu' }),
      application(4, {
        company: 'Autre',
        groupName: 'Évaluation Groupe',
        deadlineLabel: 'évaluation',
      }),
    ];

    expect(numbers(applications, { text: '  évaluation ' })).toEqual([1, 2, 3]);
    expect(numbers(applications, { text: 'EVALUATION' })).toEqual([1, 2, 3]);
  });

  it('keeps only overdue deadlines or those within three days, never a closed application', () => {
    const applications = [
      application(1, { deadlineDate: '2026-10-09' }),
      application(2, { deadlineDate: '2026-10-13' }),
      application(3, { deadlineDate: '2026-10-14' }),
      application(4, { deadlineDate: null }),
      application(5, { status: 'REJECTED', deadlineDate: '2026-10-01' }),
    ];

    expect(numbers(applications, { deadlineAlertOnly: true })).toEqual([1, 2]);
  });

  it('combines every filter', () => {
    const applications = [
      application(1, {
        groupId: 1,
        status: 'PENDING',
        company: 'Fictif Aéro',
        deadlineDate: '2026-10-09',
      }),
      application(2, {
        groupId: 2,
        status: 'PENDING',
        company: 'Fictif Aéro',
        deadlineDate: '2026-10-09',
      }),
      application(3, {
        groupId: 1,
        status: 'INTERVIEW',
        company: 'Fictif Aéro',
        deadlineDate: '2026-10-09',
      }),
      application(4, {
        groupId: 1,
        status: 'PENDING',
        company: 'Autre',
        deadlineDate: '2026-10-09',
      }),
      application(5, {
        groupId: 1,
        status: 'PENDING',
        company: 'Fictif Aéro',
        deadlineDate: '2026-12-01',
      }),
    ];

    expect(
      numbers(applications, {
        statusChoice: { kind: 'category', code: 'PENDING' },
        groupId: 1,
        text: 'aero',
        deadlineAlertOnly: true,
      }),
    ).toEqual([1]);
  });
});

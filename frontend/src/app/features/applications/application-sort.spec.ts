import { JobApplication, Status, StatusCategoryCode } from './application';
import { sortApplications } from './application-sort';

function status(code: string, order: number, category: StatusCategoryCode, rank: number): Status {
  return { code, label: code, order, category: { code: category, label: category, order: rank } };
}

const STATUSES: Status[] = [
  status('OFFER', 1, 'OFFER', 1),
  status('INTERVIEW', 2, 'INTERVIEW', 2),
  status('UNDER_REVIEW', 3, 'OPENED', 3),
  status('SELECTION', 6, 'OPENED', 3),
  status('PENDING', 7, 'PENDING', 4),
  status('TO_SEND', 8, 'TO_SEND', 5),
  status('REJECTED', 9, 'REJECTED', 6),
];

function application(
  number: number,
  statusCode: string,
  deadlineDate: string | null = null,
  extra: Partial<JobApplication> = {},
): JobApplication {
  return {
    id: number * 10,
    number,
    groupId: 1,
    groupName: 'Groupe Fictif',
    company: 'Fictif Aéro',
    jobTitle: 'Stagiaire',
    status: statusCode,
    sentOn: null,
    deadlineLabel: null,
    deadlineDate,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...extra,
  };
}

const numbers = (applications: JobApplication[]) => applications.map((a) => a.number);
const NO_SORT = { active: '', direction: '' } as const;

describe('sortApplications', () => {
  describe('without a chosen sort', () => {
    it('orders by category rank first', () => {
      const applications = [
        application(1, 'REJECTED'),
        application(2, 'PENDING'),
        application(3, 'OFFER'),
        application(4, 'TO_SEND'),
        application(5, 'INTERVIEW'),
      ];

      expect(numbers(sortApplications(applications, STATUSES, NO_SORT))).toEqual([3, 5, 2, 4, 1]);
    });

    it('groups the statuses of one category together, whatever their own order', () => {
      const applications = [
        application(1, 'SELECTION', '2026-10-20'),
        application(2, 'UNDER_REVIEW', '2026-10-25'),
        application(3, 'SELECTION', '2026-10-15'),
      ];

      expect(numbers(sortApplications(applications, STATUSES, NO_SORT))).toEqual([3, 1, 2]);
    });

    it('then by deadline date, the applications without one coming last', () => {
      const applications = [
        application(1, 'PENDING'),
        application(2, 'PENDING', '2026-11-02'),
        application(3, 'PENDING', '2026-10-18'),
      ];

      expect(numbers(sortApplications(applications, STATUSES, NO_SORT))).toEqual([3, 2, 1]);
    });

    it('then by number', () => {
      const applications = [
        application(12, 'PENDING', '2026-10-18'),
        application(4, 'PENDING', '2026-10-18'),
        application(9, 'PENDING'),
        application(7, 'PENDING'),
      ];

      expect(numbers(sortApplications(applications, STATUSES, NO_SORT))).toEqual([4, 12, 7, 9]);
    });

    it('does not change the given list', () => {
      const applications = [application(2, 'PENDING'), application(1, 'PENDING')];

      sortApplications(applications, STATUSES, NO_SORT);

      expect(numbers(applications)).toEqual([2, 1]);
    });
  });

  describe('with a chosen column', () => {
    it('sorts by number in both directions', () => {
      const applications = [
        application(2, 'OFFER'),
        application(3, 'REJECTED'),
        application(1, 'PENDING'),
      ];

      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'number', direction: 'asc' })),
      ).toEqual([1, 2, 3]);
      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'number', direction: 'desc' })),
      ).toEqual([3, 2, 1]);
    });

    it('sorts a text column in French alphabetical order, ignoring case and accents', () => {
      const applications = [
        application(1, 'PENDING', null, { company: 'zéphyr' }),
        application(2, 'PENDING', null, { company: 'Éole' }),
        application(3, 'PENDING', null, { company: 'avion' }),
      ];

      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'company', direction: 'asc' })),
      ).toEqual([3, 2, 1]);
    });

    it('sorts the status column by the order of the statuses', () => {
      const applications = [
        application(1, 'TO_SEND'),
        application(2, 'OFFER'),
        application(3, 'SELECTION'),
      ];

      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'status', direction: 'asc' })),
      ).toEqual([2, 3, 1]);
    });

    it('puts empty values last in both directions', () => {
      const applications = [
        application(1, 'PENDING', null, { sentOn: null }),
        application(2, 'PENDING', null, { sentOn: '2026-10-04' }),
        application(3, 'PENDING', null, { sentOn: '2026-09-28' }),
      ];

      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'sentOn', direction: 'asc' })),
      ).toEqual([3, 2, 1]);
      expect(
        numbers(sortApplications(applications, STATUSES, { active: 'sentOn', direction: 'desc' })),
      ).toEqual([2, 3, 1]);
    });

    it('keeps the default order between equal values', () => {
      const applications = [
        application(3, 'PENDING', null, { groupName: 'Groupe B' }),
        application(1, 'OFFER', null, { groupName: 'Groupe B' }),
        application(2, 'PENDING', null, { groupName: 'Groupe A' }),
      ];

      expect(
        numbers(
          sortApplications(applications, STATUSES, { active: 'groupName', direction: 'asc' }),
        ),
      ).toEqual([2, 1, 3]);
    });
  });
});

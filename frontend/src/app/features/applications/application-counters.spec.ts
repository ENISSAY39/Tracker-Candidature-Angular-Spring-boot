import { Status, StatusCategoryCode } from '../../shared/status';
import { JobApplication } from './application';
import { countApplications } from './application-counters';

function status(code: string, category: StatusCategoryCode, label: string, rank: number): Status {
  return { code, label: code, order: rank, category: { code: category, label, order: rank } };
}

const STATUSES: Status[] = [
  status('OFFER', 'OFFER', 'Offre', 1),
  status('INTERVIEW', 'INTERVIEW', 'Entretien', 2),
  status('UNDER_REVIEW', 'OPENED', 'Dossier ouvert par le recruteur', 3),
  status('SELECTION', 'OPENED', 'Dossier ouvert par le recruteur', 3),
  status('PENDING', 'PENDING', 'En attente', 4),
  status('REJECTED', 'REJECTED', 'Refus', 6),
];

function application(number: number, statusCode: string): JobApplication {
  return {
    id: number,
    number,
    groupId: 1,
    groupName: 'Groupe Fictif',
    company: 'Fictif Aéro',
    jobTitle: 'Stagiaire',
    status: statusCode,
    sentOn: '2026-10-01',
    deadlineLabel: null,
    deadlineDate: null,
    notes: null,
    startPeriod: null,
    channel: null,
    cvSent: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  };
}

describe('countApplications', () => {
  it('gives the total then one counter per non-empty category, in category order', () => {
    const counters = countApplications(
      [
        application(1, 'REJECTED'),
        application(2, 'PENDING'),
        application(3, 'UNDER_REVIEW'),
        application(4, 'PENDING'),
        application(5, 'SELECTION'),
        application(6, 'OFFER'),
      ],
      STATUSES,
    );

    expect(counters.map((counter) => [counter.label, counter.count])).toEqual([
      ['Total', 6],
      ['Offre', 1],
      ['Dossier ouvert par le recruteur', 2],
      ['En attente', 2],
      ['Refus', 1],
    ]);
  });

  it('names the category of each counter, and none for the total', () => {
    const counters = countApplications([application(1, 'INTERVIEW')], STATUSES);

    expect(counters.map((counter) => counter.category)).toEqual([null, 'INTERVIEW']);
  });

  it('gives only the total, at zero, without any application', () => {
    expect(countApplications([], STATUSES)).toEqual([{ category: null, label: 'Total', count: 0 }]);
  });
});

import { Status } from '../../shared/status';
import { JobApplication } from './application';
import { needsSentOnDialog } from './status-change';

function status(requiresSentOn: boolean): Status {
  return {
    code: 'X',
    label: 'X',
    order: 1,
    requiresSentOn,
    closed: false,
    category: { code: 'PENDING', label: 'En attente', order: 4 },
  };
}

const application = (sentOn: string | null) => ({ sentOn }) as JobApplication;

describe('needsSentOnDialog', () => {
  it('asks for the sent date when the new status needs one and the application has none', () => {
    expect(needsSentOnDialog(application(null), status(true))).toBe(true);
  });

  it('does not ask when the application already has a sent date', () => {
    expect(needsSentOnDialog(application('2026-10-04'), status(true))).toBe(false);
  });

  it('does not ask when the new status needs no sent date', () => {
    expect(needsSentOnDialog(application(null), status(false))).toBe(false);
  });
});

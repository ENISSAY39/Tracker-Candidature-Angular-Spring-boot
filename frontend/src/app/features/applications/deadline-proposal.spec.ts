import { proposeDeadline } from './deadline-proposal';

describe('proposeDeadline', () => {
  it('proposes the sent date + 14 days when the deadline is empty', () => {
    expect(proposeDeadline('2026-10-04', null, false)).toBe('2026-10-18');
  });

  it('crosses the end of a month', () => {
    expect(proposeDeadline('2026-10-25', null, false)).toBe('2026-11-08');
  });

  it('keeps a deadline already filled in', () => {
    expect(proposeDeadline('2026-10-04', '2026-10-30', false)).toBe('2026-10-30');
  });

  it('proposes nothing for a closed status', () => {
    expect(proposeDeadline('2026-10-04', null, true)).toBeNull();
  });

  it('proposes nothing without a sent date', () => {
    expect(proposeDeadline(null, null, false)).toBeNull();
  });
});

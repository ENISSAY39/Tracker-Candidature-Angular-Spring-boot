import { deadlineAlert } from './deadline-alert';

describe('deadlineAlert', () => {
  const today = '2026-10-10';

  it('is overdue when the deadline was yesterday or before', () => {
    expect(deadlineAlert('2026-10-09', false, today)).toBe('overdue');
    expect(deadlineAlert('2026-09-30', false, today)).toBe('overdue');
  });

  it('is soon from today to three days ahead included', () => {
    expect(deadlineAlert('2026-10-10', false, today)).toBe('soon');
    expect(deadlineAlert('2026-10-13', false, today)).toBe('soon');
  });

  it('is none from four days ahead', () => {
    expect(deadlineAlert('2026-10-14', false, today)).toBe('none');
  });

  it('counts the three days across the end of a month', () => {
    expect(deadlineAlert('2026-11-02', false, '2026-10-30')).toBe('soon');
    expect(deadlineAlert('2026-11-03', false, '2026-10-30')).toBe('none');
  });

  it('is none for a closed application, even overdue', () => {
    expect(deadlineAlert('2026-10-01', true, today)).toBe('none');
  });

  it('is none without a deadline date', () => {
    expect(deadlineAlert(null, false, today)).toBe('none');
  });
});

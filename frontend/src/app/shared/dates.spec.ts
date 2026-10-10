import { addDays, compareDates, fromDay, toDay, today } from './dates';

describe('dates', () => {
  describe('today', () => {
    it('gives the local calendar day as yyyy-MM-dd', () => {
      expect(today(new Date(2026, 9, 4, 8, 30))).toBe('2026-10-04');
    });

    it('keeps the local day just before midnight, with no shift to UTC', () => {
      expect(today(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
      expect(today(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
    });

    it('pads the month and the day', () => {
      expect(today(new Date(2027, 1, 3))).toBe('2027-02-03');
    });
  });

  describe('addDays', () => {
    it('adds days within a month', () => {
      expect(addDays('2026-10-04', 14)).toBe('2026-10-18');
    });

    it('crosses the end of a month and of a year', () => {
      expect(addDays('2026-10-25', 14)).toBe('2026-11-08');
      expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    });

    it('handles February of a leap year', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    });

    it('crosses a daylight saving change without shifting a day', () => {
      expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
      expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    });

    it('subtracts days with a negative count', () => {
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });
  });

  describe('compareDates', () => {
    it('orders two days chronologically', () => {
      expect(compareDates('2026-09-30', '2026-10-01')).toBeLessThan(0);
      expect(compareDates('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
      expect(compareDates('2026-10-04', '2026-10-04')).toBe(0);
    });
  });

  describe('toDay and fromDay', () => {
    it('turn a picked date into its local day and back, without shifting a day', () => {
      expect(toDay(new Date(2026, 9, 4))).toBe('2026-10-04');
      expect(toDay(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
      expect(fromDay('2026-10-04')).toEqual(new Date(2026, 9, 4));
      expect(toDay(fromDay('2027-02-28'))).toBe('2027-02-28');
    });
  });
});

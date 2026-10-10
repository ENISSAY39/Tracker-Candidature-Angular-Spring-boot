import { TestBed } from '@angular/core/testing';
import { DeadlineCell } from './deadline-cell';

describe('DeadlineCell', () => {
  async function render(date: string | null, closed = false): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(DeadlineCell);
    fixture.componentRef.setInput('date', date);
    fixture.componentRef.setInput('closed', closed);
    fixture.componentRef.setInput('today', '2026-10-10');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows an overdue date in bold dark red', async () => {
    const cell = await render('2026-10-09');

    expect(cell.textContent?.trim()).toBe('09/10/2026');
    expect(cell.style.fontWeight).toBe('bold');
    expect(cell.style.color).toBe('rgb(192, 0, 0)');
  });

  it('shows a date within three days in bold orange', async () => {
    const cell = await render('2026-10-13');

    expect(cell.style.fontWeight).toBe('bold');
    expect(cell.style.color).toBe('rgb(180, 83, 9)');
  });

  it('shows a later date without emphasis', async () => {
    const cell = await render('2026-10-14');

    expect(cell.textContent?.trim()).toBe('14/10/2026');
    expect(cell.style.fontWeight).toBe('');
    expect(cell.style.color).toBe('');
  });

  it('shows no alert on a closed application', async () => {
    const cell = await render('2026-10-01', true);

    expect(cell.style.fontWeight).toBe('');
  });

  it('stays empty without a date', async () => {
    const cell = await render(null);

    expect(cell.textContent?.trim()).toBe('');
  });
});

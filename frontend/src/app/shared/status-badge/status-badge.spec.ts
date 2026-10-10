import { TestBed } from '@angular/core/testing';
import { Status } from '../status';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  async function render(status: Status): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the label of the status in the colours of its category', async () => {
    const badge = await render({
      code: 'IN_EVALUATION',
      label: "En cours d'évaluation",
      order: 4,
      requiresSentOn: true,
      closed: false,
      category: { code: 'OPENED', label: 'Dossier ouvert par le recruteur', order: 3 },
    });

    expect(badge.textContent?.trim()).toBe("En cours d'évaluation");
    expect(badge.style.backgroundColor).toBe('rgb(255, 217, 102)');
    expect(badge.style.color).toBe('rgb(107, 80, 0)');
  });

  it('uses the red palette for a rejection', async () => {
    const badge = await render({
      code: 'REJECTED',
      label: 'Refus',
      order: 9,
      requiresSentOn: true,
      closed: true,
      category: { code: 'REJECTED', label: 'Refus', order: 6 },
    });

    expect(badge.style.backgroundColor).toBe('rgb(255, 199, 206)');
    expect(badge.style.color).toBe('rgb(156, 0, 6)');
  });
});

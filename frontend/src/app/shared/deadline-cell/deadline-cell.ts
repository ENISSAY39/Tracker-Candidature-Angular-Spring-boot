import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { deadlineAlert } from '../deadline-alert';

// Couleurs d'alerte de CLAUDE.md, contraste WCAG AA vérifié sur fond clair
const ALERT_COLORS = { overdue: '#C00000', soon: '#B45309' } as const;

/** Date d'échéance au format français, en gras rouge si dépassée, en gras orange d'aujourd'hui à J+3. */
@Component({
  imports: [DatePipe],
  selector: 'app-deadline-cell',
  template: `{{ date() | date: 'dd/MM/yyyy' }}`,
  host: {
    '[style.font-weight]': "alert() === 'none' ? null : 'bold'",
    '[style.color]': 'color()',
  },
})
export class DeadlineCell {
  readonly date = input.required<string | null>();
  readonly closed = input.required<boolean>();
  /** Date du jour `yyyy-MM-dd`, fournie par l'appelant. */
  readonly today = input.required<string>();

  protected readonly alert = computed(() =>
    deadlineAlert(this.date(), this.closed(), this.today()),
  );

  protected readonly color = computed(() => {
    const alert = this.alert();
    return alert === 'none' ? null : ALERT_COLORS[alert];
  });
}

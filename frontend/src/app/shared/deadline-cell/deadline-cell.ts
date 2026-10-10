import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { deadlineAlert } from '../deadline-alert';

// L'alerte ne doit pas reposer sur la couleur seule (WCAG 1.4.1) : texte lu par les lecteurs d'écran
const ALERT_TEXTS = { overdue: 'échéance dépassée', soon: 'échéance proche' } as const;

/** Date d'échéance au format français, en gras rouge si dépassée, en gras orange d'aujourd'hui à J+3. */
@Component({
  imports: [DatePipe],
  selector: 'app-deadline-cell',
  template: `{{ date() | date: 'dd/MM/yyyy' }}
    @if (alertText(); as text) {
      <span class="cdk-visually-hidden">({{ text }})</span>
    }`,
  // Couleurs d'alerte de CLAUDE.md, contraste WCAG AA vérifié sur fond clair et sur fond sombre
  styles: `
    :host(.overdue) {
      color: light-dark(#c00000, #ff8a80);
    }

    :host(.soon) {
      color: light-dark(#b45309, #ffb74d);
    }
  `,
  host: {
    '[style.font-weight]': "alert() === 'none' ? null : 'bold'",
    '[class.overdue]': "alert() === 'overdue'",
    '[class.soon]': "alert() === 'soon'",
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

  protected readonly alertText = computed(() => {
    const alert = this.alert();
    return alert === 'none' ? null : ALERT_TEXTS[alert];
  });
}

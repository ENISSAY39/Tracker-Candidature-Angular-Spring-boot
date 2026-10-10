import { CanDeactivateFn } from '@angular/router';
import { of } from 'rxjs';
import type { ApplicationForm } from './application-form';

/** Garde de route : confirmation avant de quitter un formulaire modifié et non enregistré. */
export const leaveApplicationForm: CanDeactivateFn<ApplicationForm> = (component) => {
  const canLeave = component.canLeave();
  return typeof canLeave === 'boolean' ? of(canLeave) : canLeave;
};

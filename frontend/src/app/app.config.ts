import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
} from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { FrenchDateAdapter } from './core/french-date-adapter';
import { httpErrorsInterceptor } from './core/http-errors-interceptor';
import { routes } from './app.routes';

// Interface en français uniquement : pipes et composants Material en fr-FR (dates dd/MM/yyyy)
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Paramètres d'URL (`:id`) passés aux entrées des composants routés
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([httpErrorsInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: FrenchDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
  ],
};

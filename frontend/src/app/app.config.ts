import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideFrenchLocale } from './core/french-locale';
import { httpErrorsInterceptor } from './core/http-errors-interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Paramètres d'URL (`:id`) passés aux entrées des composants routés
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([httpErrorsInterceptor])),
    provideFrenchLocale(),
  ],
};

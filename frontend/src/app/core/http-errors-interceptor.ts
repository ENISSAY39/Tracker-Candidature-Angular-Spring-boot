import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

const UNREACHABLE_MESSAGE = 'Le serveur est injoignable. Vérifiez que l’API est démarrée.';
const GENERIC_MESSAGE = 'Une erreur est survenue.';

/**
 * Affiche toute erreur HTTP dans un snackbar (le `detail` du `ProblemDetail` de l'API), puis la relance
 * pour que l'écran puisse la traiter.
 */
export const httpErrorsInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        snackBar.open(messageOf(error), 'Fermer', { duration: 5000 });
      }
      return throwError(() => error);
    }),
  );
};

function messageOf(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return UNREACHABLE_MESSAGE;
  }
  const detail: unknown = (error.error as { detail?: unknown } | null)?.detail;
  return typeof detail === 'string' && detail !== '' ? detail : GENERIC_MESSAGE;
}

import { HttpErrorResponse } from '@angular/common/http';
import { FieldTree, TreeValidationResult } from '@angular/forms/signals';

/**
 * Erreurs `errors` d'un 400 du backend (`[{field, message}]`), placées sous les champs du formulaire qui portent le
 * même nom ; rien pour une autre erreur ou un champ inconnu du formulaire.
 */
export function serverFieldErrors(error: unknown, form: object): TreeValidationResult {
  if (!(error instanceof HttpErrorResponse)) {
    return undefined;
  }
  const errors: { field?: unknown; message?: unknown }[] = error.error?.errors ?? [];
  const fields = form as Record<string, FieldTree<unknown> | undefined>;
  return errors.flatMap(({ field, message }) => {
    const fieldTree = typeof field === 'string' ? fields[field] : undefined;
    return fieldTree && typeof message === 'string' ? [{ fieldTree, kind: 'server', message }] : [];
  });
}

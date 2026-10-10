package io.github.enissay39.tracker.common;

import java.util.List;

import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.databind.exc.MismatchedInputException;

/**
 * Point unique de traduction des erreurs en {@link ProblemDetail} (RFC 9457), textes en français. Les erreurs de
 * Spring MVC non reprises ici (405, 415…) gardent le {@code ProblemDetail} de la classe mère.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final String INVALID_FIELDS = "Un ou plusieurs champs sont invalides.";

	@ExceptionHandler(ResourceNotFoundException.class)
	ProblemDetail handleNotFound(ResourceNotFoundException ex) {
		return problem(HttpStatus.NOT_FOUND, "Ressource introuvable", ex.getMessage());
	}

	@ExceptionHandler(ConflictException.class)
	ProblemDetail handleConflict(ConflictException ex) {
		return problem(HttpStatus.CONFLICT, "Conflit", ex.getMessage());
	}

	@ExceptionHandler(InvalidRequestException.class)
	ProblemDetail handleInvalidRequest(InvalidRequestException ex) {
		return problem(HttpStatus.BAD_REQUEST, "Requête invalide", ex.getMessage());
	}

	@ExceptionHandler(FieldRuleViolationException.class)
	ProblemDetail handleFieldRuleViolation(FieldRuleViolationException ex) {
		return invalidFields(ex.getMessage(), List.of(new InvalidField(ex.getField(), ex.getMessage())));
	}

	// Filet : la cause part dans les logs, jamais dans la réponse
	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception ex) {
		logger.error("Unexpected error", ex);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne", "Une erreur inattendue est survenue.");
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		List<InvalidField> errors = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(error -> new InvalidField(error.getField(), error.getDefaultMessage()))
			.toList();
		return handleExceptionInternal(ex, invalidFields(INVALID_FIELDS, errors), headers, status, request);
	}

	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		String field = mismatchedField(ex.getCause());
		ProblemDetail problem = (field != null)
				? invalidFields(INVALID_FIELDS, List.of(new InvalidField(field, "Valeur invalide.")))
				: problem(HttpStatus.BAD_REQUEST, "Requête invalide", "Le corps de la requête est illisible.");
		return handleExceptionInternal(ex, problem, headers, status, request);
	}

	// Paramètre de chemin ou de requête du mauvais type, par exemple un identifiant non numérique
	@Override
	protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Requête invalide",
				"Le paramètre « " + ex.getPropertyName() + " » est invalide.");
		return handleExceptionInternal(ex, problem, headers, status, request);
	}

	// Champ JSON dont la valeur n'a pas le type attendu (enum inconnu, date mal formée…), null si le JSON est illisible
	private static String mismatchedField(Throwable cause) {
		if (cause instanceof MismatchedInputException mismatch && !mismatch.getPath().isEmpty()) {
			return mismatch.getPath().getLast().getPropertyName();
		}
		return null;
	}

	private static ProblemDetail invalidFields(String detail, List<InvalidField> errors) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Requête invalide", detail);
		problem.setProperty("errors", errors);
		return problem;
	}

	private static ProblemDetail problem(HttpStatus status, String title, String detail) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setTitle(title);
		return problem;
	}

}

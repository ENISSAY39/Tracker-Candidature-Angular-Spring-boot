package io.github.enissay39.tracker.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(GlobalExceptionHandlerTest.ProbeController.class)
@Import(GlobalExceptionHandlerTest.ProbeController.class)
class GlobalExceptionHandlerTest {

	@Autowired
	private MockMvcTester mvc;

	@Test
	void aMissingResourceGivesA404ProblemDetail() {
		assertThat(mvc.get().uri("/probe/not-found")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 404, "title": "Ressource introuvable", "detail": "Candidature 42 introuvable."}
					""");
	}

	@Test
	void aConflictGivesA409ProblemDetail() {
		assertThat(mvc.get().uri("/probe/conflict")).hasStatus(HttpStatus.CONFLICT)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 409, "title": "Conflit", "detail": "Le groupe « Groupe Fictif » existe déjà."}
					""");
	}

	@Test
	void anInvalidRequestGivesA400ProblemDetailWithItsMessage() {
		assertThat(mvc.get().uri("/probe/invalid-request")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide",
					 "detail": "Le fichier n'est pas un classeur Excel lisible (.xlsx)."}
					""")
			.doesNotHavePath("$.errors");
	}

	@Test
	void aBusinessRuleOnAFieldGivesA400NamingTheField() {
		assertThat(mvc.get().uri("/probe/field-rule")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide",
					 "detail": "La date d'envoi est obligatoire pour ce statut.",
					 "errors": [{"field": "sentOn", "message": "La date d'envoi est obligatoire pour ce statut."}]}
					""");
	}

	@Test
	void aValidationFailureGivesA400ListingEveryInvalidFieldInFrench() {
		assertThat(mvc.post()
			.uri("/probe/body")
			.contentType(MediaType.APPLICATION_JSON)
			.header(HttpHeaders.ACCEPT_LANGUAGE, "en")
			.content("""
					{"name": " ", "code": "TROPLONG"}
					""")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Un ou plusieurs champs sont invalides.",
					 "errors": [{"field": "name", "message": "ne doit pas être vide"},
					            {"field": "code", "message": "la taille doit être comprise entre 0 et 5"}]}
					""");
	}

	@ParameterizedTest
	@ValueSource(strings = { "{\"name\": ", "[]" })
	void unreadableJsonGivesA400ProblemDetail(String body) {
		assertThat(mvc.post().uri("/probe/body").contentType(MediaType.APPLICATION_JSON).content(body))
			.hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Le corps de la requête est illisible."}
					""")
			.doesNotHavePath("$.errors");
	}

	@Test
	void anUnknownEnumValueGivesA400NamingTheField() {
		assertThat(mvc.post().uri("/probe/body").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "Fictif", "choice": "INCONNU"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Un ou plusieurs champs sont invalides.",
					 "errors": [{"field": "choice", "message": "Valeur invalide."}]}
					""");
	}

	@Test
	void aMalformedDateGivesA400NamingTheField() {
		assertThat(mvc.post().uri("/probe/body").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "Fictif", "day": "18/10/2026"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Un ou plusieurs champs sont invalides.",
					 "errors": [{"field": "day", "message": "Valeur invalide."}]}
					""");
	}

	@Test
	void aNonNumericPathIdentifierGivesA400ProblemDetail() {
		assertThat(mvc.get().uri("/probe/items/abc")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Le paramètre « id » est invalide."}
					""");
	}

	@Test
	void anUnexpectedErrorGivesAGeneric500WithoutTechnicalDetail() {
		MvcTestResult result = mvc.get().uri("/probe/unexpected").exchange();

		assertThat(result).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 500, "title": "Erreur interne", "detail": "Une erreur inattendue est survenue."}
					""");
		assertThat(result).bodyText().doesNotContain("IllegalStateException", "connexion perdue", "ProbeController");
	}

	@Test
	void aSpringMvcErrorKeepsItsOwnStatusAsAProblemDetail() {
		assertThat(mvc.delete().uri("/probe/not-found")).hasStatus(HttpStatus.METHOD_NOT_ALLOWED)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
	}

	/**
	 * Contrôleur fictif : chaque route déclenche une des erreurs que l'API doit traduire.
	 */
	@RestController
	@RequestMapping("/probe")
	static class ProbeController {

		@GetMapping("/not-found")
		void notFound() {
			throw new ResourceNotFoundException("Candidature 42 introuvable.");
		}

		@GetMapping("/conflict")
		void conflict() {
			throw new ConflictException("Le groupe « Groupe Fictif » existe déjà.");
		}

		@GetMapping("/invalid-request")
		void invalidRequest() {
			throw new InvalidRequestException("Le fichier n'est pas un classeur Excel lisible (.xlsx).");
		}

		@GetMapping("/field-rule")
		void fieldRule() {
			throw new FieldRuleViolationException("sentOn", "La date d'envoi est obligatoire pour ce statut.");
		}

		@PostMapping("/body")
		void body(@Valid @RequestBody ProbeRequest request) {
		}

		@GetMapping("/items/{id}")
		void item(@PathVariable Long id) {
		}

		@GetMapping("/unexpected")
		void unexpected() {
			throw new IllegalStateException("connexion perdue");
		}

	}

	enum ProbeChoice {

		FIRST, SECOND

	}

	record ProbeRequest(@NotBlank String name, @Size(max = 5) String code, ProbeChoice choice, LocalDate day) {

	}

}

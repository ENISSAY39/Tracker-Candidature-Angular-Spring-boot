package io.github.enissay39.tracker.jobapplication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import io.github.enissay39.tracker.common.FieldRuleViolationException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import io.github.enissay39.tracker.jobapplication.dto.StatusChangeRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(JobApplicationController.class)
class JobApplicationControllerTest {

	private static final String APPLICATION_JSON = """
			{"id": 5, "number": 26, "groupId": 3, "groupName": "Groupe Fictif", "company": "Fictif Aéro",
			 "jobTitle": "Stagiaire ingénieur logiciel", "status": "PENDING", "sentOn": "2026-10-04",
			 "deadlineLabel": "Relance le 18/10", "deadlineDate": "2026-10-18", "notes": "04/10 : déposée.",
			 "startPeriod": "Févr. 2027, 6 mois", "channel": "Site carrière", "cvSent": "CV_Test.pdf",
			 "createdAt": "2026-10-04T08:00:00Z", "updatedAt": "2026-10-05T09:30:00Z"}
			""";

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private JobApplicationService service;

	@Test
	void listGivesEveryApplication() {
		when(service.findAll()).thenReturn(List.of(application()));

		assertThat(mvc.get().uri("/api/applications")).hasStatusOk()
			.bodyJson()
			.isStrictlyEqualTo("[" + APPLICATION_JSON + "]");
	}

	@Test
	void getGivesTheApplication() {
		when(service.findById(5L)).thenReturn(application());

		assertThat(mvc.get().uri("/api/applications/5")).hasStatusOk().bodyJson().isStrictlyEqualTo(APPLICATION_JSON);
	}

	@Test
	void getOfAnUnknownApplicationGives404ProblemDetail() {
		when(service.findById(42L)).thenThrow(new ResourceNotFoundException("Candidature 42 introuvable."));

		assertThat(mvc.get().uri("/api/applications/42")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 404, "title": "Ressource introuvable", "detail": "Candidature 42 introuvable."}
					""");
	}

	@Test
	void createGives201WithTheCreatedApplicationAndItsLocation() {
		when(service.create(any())).thenReturn(application());

		assertThat(mvc.post().uri("/api/applications").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "Groupe Fictif", "company": "Fictif Aéro", "jobTitle": "Stagiaire ingénieur logiciel",
				 "status": "PENDING", "sentOn": "2026-10-04", "deadlineDate": "2026-10-18"}
				""")).hasStatus(HttpStatus.CREATED)
			.hasHeader(HttpHeaders.LOCATION, "http://localhost/api/applications/5")
			.bodyJson()
			.isStrictlyEqualTo(APPLICATION_JSON);
	}

	@Test
	void createWithMissingRequiredFieldsGives400ListingThem() {
		assertThat(mvc.post().uri("/api/applications").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "  ", "company": "", "sentOn": "2026-10-04"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "title": "Requête invalide", "detail": "Un ou plusieurs champs sont invalides.",
					 "errors": [{"field": "groupName", "message": "ne doit pas être vide"},
					            {"field": "company", "message": "ne doit pas être vide"},
					            {"field": "jobTitle", "message": "ne doit pas être vide"},
					            {"field": "status", "message": "ne doit pas être nul"}]}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void createWithTooLongTextsGives400ListingThem() {
		String tooLongGroup = "G".repeat(101);
		String tooLongTitle = "T".repeat(256);

		assertThat(mvc.post().uri("/api/applications").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "%s", "company": "Fictif Aéro", "jobTitle": "%s", "status": "TO_SEND"}
				""".formatted(tooLongGroup, tooLongTitle))).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "groupName", "message": "la taille doit être comprise entre 0 et 100"},
					            {"field": "jobTitle", "message": "la taille doit être comprise entre 0 et 255"}]}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void createWithAnUnknownStatusGives400NamingTheField() {
		assertThat(mvc.post().uri("/api/applications").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "Groupe Fictif", "company": "Fictif Aéro", "jobTitle": "Stagiaire", "status": "SENT"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "status", "message": "Valeur invalide."}]}
					""");
	}

	@Test
	void createRefusedByABusinessRuleGives400NamingTheField() {
		when(service.create(any()))
			.thenThrow(new FieldRuleViolationException("sentOn", "La date d'envoi est obligatoire pour ce statut."));

		assertThat(mvc.post().uri("/api/applications").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "Groupe Fictif", "company": "Fictif Aéro", "jobTitle": "Stagiaire", "status": "PENDING"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "sentOn", "message": "La date d'envoi est obligatoire pour ce statut."}]}
					""");
	}

	@Test
	void updateGives200WithTheUpdatedApplication() {
		when(service.update(eq(5L), any())).thenReturn(application());

		assertThat(mvc.put().uri("/api/applications/5").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "Groupe Fictif", "company": "Fictif Aéro", "jobTitle": "Stagiaire ingénieur logiciel",
				 "status": "PENDING", "sentOn": "2026-10-04", "deadlineDate": "2026-10-18"}
				""")).hasStatusOk().bodyJson().isStrictlyEqualTo(APPLICATION_JSON);
	}

	@Test
	void updateWithMissingRequiredFieldsGives400ListingThem() {
		assertThat(mvc.put().uri("/api/applications/5").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "", "company": "Fictif Aéro", "jobTitle": "Stagiaire"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "groupName", "message": "ne doit pas être vide"},
					            {"field": "status", "message": "ne doit pas être nul"}]}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void updateOfAnUnknownApplicationGives404ProblemDetail() {
		when(service.update(eq(42L), any())).thenThrow(new ResourceNotFoundException("Candidature 42 introuvable."));

		assertThat(mvc.put().uri("/api/applications/42").contentType(MediaType.APPLICATION_JSON).content("""
				{"groupName": "Groupe Fictif", "company": "Fictif Aéro", "jobTitle": "Stagiaire", "status": "TO_SEND"}
				""")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 404, "detail": "Candidature 42 introuvable."}
					""");
	}

	@Test
	void deleteGives204() {
		assertThat(mvc.delete().uri("/api/applications/5")).hasStatus(HttpStatus.NO_CONTENT);
		verify(service).delete(5L);
	}

	@Test
	void deleteOfAnUnknownApplicationGives404ProblemDetail() {
		doThrow(new ResourceNotFoundException("Candidature 42 introuvable.")).when(service).delete(42L);

		assertThat(mvc.delete().uri("/api/applications/42")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 404, "detail": "Candidature 42 introuvable."}
					""");
	}

	@Test
	void changeStatusGives200WithTheUpdatedApplication() {
		when(service.changeStatus(5L, new StatusChangeRequest(ApplicationStatus.PENDING, LocalDate.of(2026, 10, 4),
				LocalDate.of(2026, 10, 18))))
			.thenReturn(application());

		assertThat(mvc.patch().uri("/api/applications/5/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"status": "PENDING", "sentOn": "2026-10-04", "deadlineDate": "2026-10-18"}
				""")).hasStatusOk().bodyJson().isStrictlyEqualTo(APPLICATION_JSON);
	}

	@Test
	void changeStatusAcceptsAStatusAlone() {
		when(service.changeStatus(5L, new StatusChangeRequest(ApplicationStatus.INTERVIEW, null, null)))
			.thenReturn(application());

		assertThat(mvc.patch().uri("/api/applications/5/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"status": "INTERVIEW"}
				""")).hasStatusOk();
	}

	@Test
	void changeStatusWithoutStatusGives400NamingTheField() {
		assertThat(mvc.patch().uri("/api/applications/5/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"sentOn": "2026-10-04"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "status", "message": "ne doit pas être nul"}]}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void changeStatusWithAnUnknownStatusGives400NamingTheField() {
		assertThat(mvc.patch().uri("/api/applications/5/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"status": "SENT"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "status", "message": "Valeur invalide."}]}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void changeStatusWithoutSentDateGives400NamingSentOn() {
		when(service.changeStatus(eq(5L), any()))
			.thenThrow(new FieldRuleViolationException("sentOn", "La date d'envoi est obligatoire pour ce statut."));

		assertThat(mvc.patch().uri("/api/applications/5/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"status": "PENDING"}
				""")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"errors": [{"field": "sentOn", "message": "La date d'envoi est obligatoire pour ce statut."}]}
					""");
	}

	@Test
	void changeStatusOfAnUnknownApplicationGives404ProblemDetail() {
		when(service.changeStatus(eq(42L), any()))
			.thenThrow(new ResourceNotFoundException("Candidature 42 introuvable."));

		assertThat(mvc.patch().uri("/api/applications/42/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"status": "TO_SEND"}
				""")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 404, "detail": "Candidature 42 introuvable."}
					""");
	}

	private static JobApplicationResponse application() {
		return new JobApplicationResponse(5L, 26, 3L, "Groupe Fictif", "Fictif Aéro", "Stagiaire ingénieur logiciel",
				ApplicationStatus.PENDING, LocalDate.of(2026, 10, 4), "Relance le 18/10", LocalDate.of(2026, 10, 18),
				"04/10 : déposée.", "Févr. 2027, 6 mois", "Site carrière", "CV_Test.pdf",
				Instant.parse("2026-10-04T08:00:00Z"), Instant.parse("2026-10-05T09:30:00Z"));
	}

}

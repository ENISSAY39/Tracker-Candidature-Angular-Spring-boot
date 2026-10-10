package io.github.enissay39.tracker.joblead;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(JobLeadController.class)
class JobLeadControllerTest {

	private static final Instant CREATED = Instant.parse("2026-10-01T08:00:00Z");

	private static final Instant UPDATED = Instant.parse("2026-10-02T09:30:00Z");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private JobLeadService service;

	@Test
	void listGivesEveryLeadWithAllItsFields() {
		when(service.findAll(null)).thenReturn(List.of(toEvaluate(), discarded()));

		assertThat(mvc.get().uri("/api/leads")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				[
				  {"id": 1, "company": "Fictif Aéro", "jobTitle": "Stagiaire logiciel", "plannedCv": "CV_Test.pdf",
				   "remark": "Annonce fictive", "discardReason": null, "state": "TO_EVALUATE",
				   "createdAt": "2026-10-01T08:00:00Z", "updatedAt": "2026-10-02T09:30:00Z"},
				  {"id": 2, "company": "Fictif Spatial", "jobTitle": "Stagiaire data", "plannedCv": null,
				   "remark": null, "discardReason": "Trop loin de Ville-Test", "state": "DISCARDED",
				   "createdAt": "2026-10-01T08:00:00Z", "updatedAt": "2026-10-02T09:30:00Z"}
				]
				""");
	}

	@Test
	void listFiltersOnTheState() {
		when(service.findAll(LeadState.DISCARDED)).thenReturn(List.of(discarded()));

		assertThat(mvc.get().uri("/api/leads?state=DISCARDED")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
				[{"id": 2, "state": "DISCARDED"}]
				""");
	}

	@Test
	void listWithAnUnknownStateGives400() {
		assertThat(mvc.get().uri("/api/leads?state=ABANDONED")).hasStatus(HttpStatus.BAD_REQUEST)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "detail": "Le paramètre « state » est invalide."}
					""");
		verifyNoInteractions(service);
	}

	@Test
	void createGives201WithTheLeadToEvaluate() {
		when(service.create(new JobLeadRequest("Fictif Aéro", "Stagiaire logiciel", "CV_Test.pdf", "Annonce fictive")))
			.thenReturn(toEvaluate());

		assertThat(mvc.post().uri("/api/leads").contentType(MediaType.APPLICATION_JSON).content("""
				{"company": "Fictif Aéro", "jobTitle": "Stagiaire logiciel", "plannedCv": "CV_Test.pdf",
				 "remark": "Annonce fictive"}
				""")).hasStatus(HttpStatus.CREATED).bodyJson().isLenientlyEqualTo("""
				{"id": 1, "state": "TO_EVALUATE", "discardReason": null}
				""");
	}

	@Test
	void createWithoutCompanyOrJobTitleGives400NamingTheFields() {
		assertThat(mvc.post().uri("/api/leads").contentType(MediaType.APPLICATION_JSON).content("""
				{"company": " ", "plannedCv": "%s"}
				""".formatted("C".repeat(256)))).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.errors[*].field")
			.asArray()
			.containsExactlyInAnyOrder("company", "jobTitle", "plannedCv");
		verifyNoInteractions(service);
	}

	@Test
	void updateGives200WithTheUpdatedLead() {
		when(service.update(2L, new JobLeadRequest("Fictif Spatial", "Stagiaire data", null, null)))
			.thenReturn(discarded());

		assertThat(mvc.put().uri("/api/leads/2").contentType(MediaType.APPLICATION_JSON).content("""
				{"company": "Fictif Spatial", "jobTitle": "Stagiaire data"}
				""")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
				{"id": 2, "state": "DISCARDED", "discardReason": "Trop loin de Ville-Test"}
				""");
	}

	@Test
	void updateOfAnUnknownLeadGives404() {
		when(service.update(99L, new JobLeadRequest("Fictif Aéro", "Stagiaire logiciel", null, null)))
			.thenThrow(new ResourceNotFoundException("Piste 99 introuvable."));

		assertThat(mvc.put().uri("/api/leads/99").contentType(MediaType.APPLICATION_JSON).content("""
				{"company": "Fictif Aéro", "jobTitle": "Stagiaire logiciel"}
				""")).hasStatus(HttpStatus.NOT_FOUND).bodyJson().isLenientlyEqualTo("""
				{"status": 404, "detail": "Piste 99 introuvable."}
				""");
	}

	@Test
	void deleteGives204() {
		assertThat(mvc.delete().uri("/api/leads/2")).hasStatus(HttpStatus.NO_CONTENT);
		verify(service).delete(2L);
	}

	@Test
	void deleteOfAnUnknownLeadGives404() {
		doThrow(new ResourceNotFoundException("Piste 99 introuvable.")).when(service).delete(99L);

		assertThat(mvc.delete().uri("/api/leads/99")).hasStatus(HttpStatus.NOT_FOUND);
	}

	private static JobLeadResponse toEvaluate() {
		return new JobLeadResponse(1L, "Fictif Aéro", "Stagiaire logiciel", "CV_Test.pdf", "Annonce fictive", null,
				LeadState.TO_EVALUATE, CREATED, UPDATED);
	}

	private static JobLeadResponse discarded() {
		return new JobLeadResponse(2L, "Fictif Spatial", "Stagiaire data", null, null, "Trop loin de Ville-Test",
				LeadState.DISCARDED, CREATED, UPDATED);
	}

}

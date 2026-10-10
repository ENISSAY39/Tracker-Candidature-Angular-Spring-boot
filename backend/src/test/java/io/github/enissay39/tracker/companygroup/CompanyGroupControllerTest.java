package io.github.enissay39.tracker.companygroup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupRequest;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(CompanyGroupController.class)
class CompanyGroupControllerTest {

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private CompanyGroupService service;

	@Test
	void listGivesEveryGroup() {
		when(service.findAll())
			.thenReturn(List.of(new CompanyGroupResponse(1L, "Alpha Fictif"), new CompanyGroupResponse(2L, "bêta Fictif")));

		assertThat(mvc.get().uri("/api/groups")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				[{"id": 1, "name": "Alpha Fictif"}, {"id": 2, "name": "bêta Fictif"}]
				""");
	}

	@Test
	void renameGives200WithTheRenamedGroup() {
		when(service.rename(3L, new CompanyGroupRequest(" Groupe Renommé ")))
			.thenReturn(new CompanyGroupResponse(3L, "Groupe Renommé"));

		assertThat(mvc.put().uri("/api/groups/3").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": " Groupe Renommé "}
				""")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				{"id": 3, "name": "Groupe Renommé"}
				""");
	}

	@Test
	void renameWithAnEmptyOrTooLongNameGives400NamingTheField() {
		assertThat(mvc.put().uri("/api/groups/3").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "  "}
				""")).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().isLenientlyEqualTo("""
				{"errors": [{"field": "name", "message": "ne doit pas être vide"}]}
				""");
		assertThat(mvc.put().uri("/api/groups/3").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "%s"}
				""".formatted("G".repeat(101)))).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().isLenientlyEqualTo("""
				{"errors": [{"field": "name", "message": "la taille doit être comprise entre 0 et 100"}]}
				""");
		verifyNoInteractions(service);
	}

	@Test
	void renameToATakenNameGives409ProblemDetail() {
		when(service.rename(3L, new CompanyGroupRequest("Autre Groupe")))
			.thenThrow(new ConflictException("Le groupe « Autre Groupe » existe déjà."));

		assertThat(mvc.put().uri("/api/groups/3").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "Autre Groupe"}
				""")).hasStatus(HttpStatus.CONFLICT)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 409, "detail": "Le groupe « Autre Groupe » existe déjà."}
					""");
	}

	@Test
	void renameOfAnUnknownGroupGives404ProblemDetail() {
		when(service.rename(42L, new CompanyGroupRequest("Groupe Fictif")))
			.thenThrow(new ResourceNotFoundException("Groupe 42 introuvable."));

		assertThat(mvc.put().uri("/api/groups/42").contentType(MediaType.APPLICATION_JSON).content("""
				{"name": "Groupe Fictif"}
				""")).hasStatus(HttpStatus.NOT_FOUND).bodyJson().isLenientlyEqualTo("""
				{"status": 404, "detail": "Groupe 42 introuvable."}
				""");
	}

	@Test
	void deleteGives204() {
		assertThat(mvc.delete().uri("/api/groups/3")).hasStatus(HttpStatus.NO_CONTENT);
		verify(service).delete(3L);
	}

	@Test
	void deleteOfAGroupWithApplicationsGives409ProblemDetail() {
		doThrow(new ConflictException("Le groupe « Groupe Fictif » a des candidatures : il ne peut pas être supprimé."))
			.when(service)
			.delete(3L);

		assertThat(mvc.delete().uri("/api/groups/3")).hasStatus(HttpStatus.CONFLICT)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 409,
					 "detail": "Le groupe « Groupe Fictif » a des candidatures : il ne peut pas être supprimé."}
					""");
	}

	@Test
	void deleteOfAnUnknownGroupGives404ProblemDetail() {
		doThrow(new ResourceNotFoundException("Groupe 42 introuvable.")).when(service).delete(42L);

		assertThat(mvc.delete().uri("/api/groups/42")).hasStatus(HttpStatus.NOT_FOUND).bodyJson().isLenientlyEqualTo("""
				{"status": 404, "detail": "Groupe 42 introuvable."}
				""");
	}

}

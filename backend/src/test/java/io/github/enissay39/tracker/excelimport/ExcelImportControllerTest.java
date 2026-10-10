package io.github.enissay39.tracker.excelimport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(ExcelImportController.class)
class ExcelImportControllerTest {

	private static final MockMultipartFile WORKBOOK = new MockMultipartFile("file", "Tracker_Fictif.xlsx",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[] { 1, 2, 3 });

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private ExcelImportService service;

	@Test
	void importGives200WithTheNumberOfCreatedRowsPerTable() {
		when(service.importWorkbook(any())).thenReturn(new ImportResultResponse(4, 37, 0));

		assertThat(mvc.post().uri("/api/import/excel").multipart().file(WORKBOOK)).hasStatusOk()
			.bodyJson()
			.isStrictlyEqualTo("""
					{"companyGroups": 4, "jobApplications": 37, "jobLeads": 0}
					""");
	}

	@Test
	void importIntoANonEmptyDatabaseGives409ProblemDetail() {
		when(service.importWorkbook(any()))
			.thenThrow(new ConflictException("La base contient déjà des candidatures : l'import est refusé."));

		assertThat(mvc.post().uri("/api/import/excel").multipart().file(WORKBOOK)).hasStatus(HttpStatus.CONFLICT)
			.hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 409, "detail": "La base contient déjà des candidatures : l'import est refusé."}
					""");
	}

	@Test
	void aRejectedWorkbookGives400ProblemDetail() {
		when(service.importWorkbook(any())).thenThrow(new InvalidRequestException(
				"Import refusé : feuille « Toutes les candidatures », ligne 7 : statut « Envoyée » inconnu."));

		assertThat(mvc.post().uri("/api/import/excel").multipart().file(WORKBOOK)).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400,
					 "detail": "Import refusé : feuille « Toutes les candidatures », ligne 7 : statut « Envoyée » inconnu."}
					""");
	}

	@Test
	void aMissingOrEmptyFileGives400InFrench() {
		assertThat(mvc.post().uri("/api/import/excel").multipart()).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "detail": "Aucun fichier n'a été envoyé."}
					""");
		assertThat(mvc.post()
			.uri("/api/import/excel")
			.multipart()
			.file(new MockMultipartFile("file", "vide.xlsx", null, new byte[0]))).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.isLenientlyEqualTo("""
					{"status": 400, "detail": "Aucun fichier n'a été envoyé."}
					""");
		verifyNoInteractions(service);
	}

}

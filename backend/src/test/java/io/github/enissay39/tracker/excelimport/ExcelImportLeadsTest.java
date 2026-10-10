package io.github.enissay39.tracker.excelimport;

import static io.github.enissay39.tracker.excelimport.TestWorkbook.application;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.util.List;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import io.github.enissay39.tracker.jobapplication.JobApplicationRepository;
import io.github.enissay39.tracker.joblead.JobLead;
import io.github.enissay39.tracker.joblead.JobLeadRepository;
import io.github.enissay39.tracker.joblead.LeadState;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Feuilles « À évaluer » et « Abandonnées » : pistes chargées avec les candidatures, dans la même transaction.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExcelImportLeadsTest {

	@Autowired
	private ExcelImportService service;

	@Autowired
	private JobApplicationRepository applicationRepository;

	@Autowired
	private CompanyGroupRepository groupRepository;

	@Autowired
	private JobLeadRepository leadRepository;

	@AfterEach
	void emptyDatabase() {
		applicationRepository.deleteAllInBatch();
		leadRepository.deleteAllInBatch();
		groupRepository.deleteAllInBatch();
	}

	@Test
	void importsTheLeadsToEvaluateAndTheDiscardedOnesWithTheApplications() {
		ImportResultResponse result = service.importWorkbook(new TestWorkbook()
			.applications(application(1, "Groupe Fictif", "À envoyer", null))
			.toEvaluate(new Object[] { "Fictif Aéro", "Stagiaire logiciel", "CV_Test.pdf", "Annonce fictive.\nÀ comparer." },
					new Object[] { "Fictif Data", "Stagiaire data" })
			.discarded(new Object[] { "Fictif Ferroviaire", "Stagiaire embarqué", "CV_Test.pdf", "Remarque fictive",
					"Trop loin de Ville-Test" })
			.toInputStream(), ImportMode.INITIAL);

		assertThat(result).isEqualTo(new ImportResultResponse(1, 1, 3));
		assertThat(leadRepository.findByStateOrderByCreatedAtAscIdAsc(LeadState.TO_EVALUATE))
			.extracting(JobLead::getCompany, JobLead::getJobTitle, JobLead::getPlannedCv, JobLead::getRemark,
					JobLead::getDiscardReason)
			.containsExactlyInAnyOrder(
					tuple("Fictif Aéro", "Stagiaire logiciel", "CV_Test.pdf", "Annonce fictive.\nÀ comparer.", null),
					tuple("Fictif Data", "Stagiaire data", null, null, null));
		assertThat(leadRepository.findByStateOrderByCreatedAtAscIdAsc(LeadState.DISCARDED))
			.extracting(JobLead::getCompany, JobLead::getPlannedCv, JobLead::getRemark, JobLead::getDiscardReason)
			.containsExactly(tuple("Fictif Ferroviaire", "CV_Test.pdf", "Remarque fictive", "Trop loin de Ville-Test"));
	}

	@Test
	void ignoresTheEmptyRowsAndTheMissingOptionalColumns() {
		ImportResultResponse result = service.importWorkbook(new TestWorkbook()
			.applications()
			.toEvaluate(new Object[] { "Fictif Aéro", "Stagiaire logiciel" }, new Object[] { null, "  " },
					new Object[] { "Fictif Data", "Stagiaire data" })
			.leads(TestWorkbook.DISCARDED_SHEET, List.of("Entreprise", "Poste", "Motif"),
					new Object[] { "Fictif Spatial", "Stagiaire DevOps", "Poste pourvu" })
			.toInputStream(), ImportMode.INITIAL);

		assertThat(result.jobLeads()).isEqualTo(3);
		assertThat(leadRepository.findByStateOrderByCreatedAtAscIdAsc(LeadState.DISCARDED))
			.extracting(JobLead::getDiscardReason)
			.containsExactly("Poste pourvu");
	}

	@Test
	void rejectsADiscardedLeadWithoutReasonCitingTheRow() {
		assertRejected(new TestWorkbook().applications(application(1, "Groupe Fictif", "À envoyer", null))
			.discarded(new Object[] { "Fictif Ferroviaire", "Stagiaire embarqué", null, null, "Trop loin" },
					new Object[] { "Fictif Spatial", "Stagiaire DevOps", null, "Remarque", "  " }),
				"Import refusé : feuille « Abandonnées », ligne 5 : « Motif » est vide alors que la piste est écartée.");
	}

	@Test
	void rejectsALeadWithoutCompanyOrJobTitleCitingTheRow() {
		assertRejected(new TestWorkbook().applications()
			.toEvaluate(new Object[] { null, "Stagiaire logiciel", "CV_Test.pdf" }),
				"Import refusé : feuille « À évaluer », ligne 4 : « Entreprise » est vide.");
		assertRejected(new TestWorkbook().applications().toEvaluate(new Object[] { "Fictif Aéro", null, null, "Remarque" }),
				"Import refusé : feuille « À évaluer », ligne 4 : « Poste » est vide.");
	}

	@Test
	void rejectsAWorkbookWithoutALeadSheet() {
		assertRejected(new TestWorkbook().applications().without(TestWorkbook.DISCARDED_SHEET),
				"La feuille « Abandonnées » est introuvable dans le classeur.");
		assertRejected(new TestWorkbook().applications().without(TestWorkbook.TO_EVALUATE_SHEET),
				"La feuille « À évaluer » est introuvable dans le classeur.");
	}

	private void assertRejected(TestWorkbook workbook, String message) {
		assertThatThrownBy(() -> service.importWorkbook(workbook.toInputStream(), ImportMode.INITIAL))
			.isInstanceOf(InvalidRequestException.class)
			.hasMessage(message);
		assertThat(applicationRepository.count()).isZero();
		assertThat(leadRepository.count()).isZero();
		assertThat(groupRepository.count()).isZero();
	}

}

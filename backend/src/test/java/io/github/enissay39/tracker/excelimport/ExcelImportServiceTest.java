package io.github.enissay39.tracker.excelimport;

import static io.github.enissay39.tracker.excelimport.TestWorkbook.application;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.time.LocalDate;
import java.util.List;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import io.github.enissay39.tracker.jobapplication.JobApplication;
import io.github.enissay39.tracker.jobapplication.JobApplicationRepository;
import io.github.enissay39.tracker.joblead.JobLeadRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExcelImportServiceTest {

	@Autowired
	private ExcelImportService service;

	@Autowired
	private JobApplicationRepository applicationRepository;

	@Autowired
	private CompanyGroupRepository groupRepository;

	@Autowired
	private JobLeadRepository leadRepository;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	// Base du conteneur de test uniquement : chaque test repart d'une base vide
	@AfterEach
	void emptyDatabase() {
		applicationRepository.deleteAllInBatch();
		leadRepository.deleteAllInBatch();
		groupRepository.deleteAllInBatch();
	}

	@Test
	void importsFreeTextsWithoutLengthLimit() {
		String longText = "Texte fictif. ".repeat(100).strip();
		TestWorkbook workbook = new TestWorkbook().applications(application(1, "Groupe Fictif", longText, longText,
				"À envoyer", null, longText, null, longText, longText, longText, longText));

		service.importWorkbook(workbook.toInputStream(), ImportMode.INITIAL);

		JobApplication imported = byNumber(1);
		assertThat(List.of(imported.getCompany(), imported.getJobTitle(), imported.getDeadlineLabel(),
				imported.getNotes(), imported.getStartPeriod(), imported.getChannel(), imported.getCvSent()))
			.containsOnly(longText);
	}

	@Test
	void importsEveryApplicationWithItsNumberAndCountsTheCreatedRows() {
		TestWorkbook workbook = new TestWorkbook().applications(
				application(26, "Groupe Fictif", "Fictif Aéro - Bureau d'études, Ville-Test",
						"Stagiaire ingénieur logiciel (réf. TEST-001)", "En attente", LocalDate.of(2026, 10, 4),
						"Relance le 18/10", LocalDate.of(2026, 10, 18), "04/10 : déposée.\nÀ relancer si pas de réponse.",
						"Févr. 2027, 6 mois", "Site carrière", "CV_Test.pdf, LM_Test.pdf"),
				application(3, "Autre Groupe", "À envoyer", null), application(12, "Groupe Fictif", "Refus",
						LocalDate.of(2026, 9, 1)));

		ImportResultResponse result = service.importWorkbook(workbook.toInputStream(), ImportMode.INITIAL);

		assertThat(result).isEqualTo(new ImportResultResponse(2, 3, 0));
		JobApplication imported = byNumber(26);
		assertThat(imported.getCompanyGroup().getName()).isEqualTo("Groupe Fictif");
		assertThat(imported.getCompany()).isEqualTo("Fictif Aéro - Bureau d'études, Ville-Test");
		assertThat(imported.getJobTitle()).isEqualTo("Stagiaire ingénieur logiciel (réf. TEST-001)");
		assertThat(imported.getStatus()).isEqualTo(ApplicationStatus.PENDING);
		assertThat(imported.getSentOn()).isEqualTo(LocalDate.of(2026, 10, 4));
		assertThat(imported.getDeadlineLabel()).isEqualTo("Relance le 18/10");
		assertThat(imported.getDeadlineDate()).isEqualTo(LocalDate.of(2026, 10, 18));
		assertThat(imported.getNotes()).isEqualTo("04/10 : déposée.\nÀ relancer si pas de réponse.");
		assertThat(imported.getStartPeriod()).isEqualTo("Févr. 2027, 6 mois");
		assertThat(imported.getChannel()).isEqualTo("Site carrière");
		assertThat(imported.getCvSent()).isEqualTo("CV_Test.pdf, LM_Test.pdf");
	}

	@Test
	void givesTheNextNumberAfterTheHighestImportedOne() {
		service.importWorkbook(new TestWorkbook()
			.applications(application(40, "Groupe Fictif", "À envoyer", null), application(7, "Groupe Fictif",
					"À envoyer", null))
			.toInputStream(), ImportMode.INITIAL);

		assertThat(applicationRepository.nextNumber()).isEqualTo(41);
	}

	@Test
	void createsOneGroupPerNameIgnoringCaseAndSpacesKeepingTheFirstSpelling() {
		ImportResultResponse result = service.importWorkbook(new TestWorkbook()
			.applications(application(1, "Groupe Fictif", "À envoyer", null),
					application(2, "  GROUPE fictif ", "À envoyer", null), application(3, "Autre", "À envoyer", null))
			.toInputStream(), ImportMode.INITIAL);

		assertThat(result.companyGroups()).isEqualTo(2);
		assertThat(groupRepository.findAllOrderedByName()).extracting(CompanyGroup::getName)
			.containsExactly("Autre", "Groupe Fictif");
	}

	@Test
	void storesEmptyTextsAsNullAndDropsTheDeadlineDateOfAClosedApplication() {
		service.importWorkbook(new TestWorkbook()
			.applications(application(1, "Groupe Fictif", "Fictif Aéro", "Stagiaire", "Abandonnée", null, "   ",
					LocalDate.of(2026, 10, 18), "", null, " ", null))
			.toInputStream(), ImportMode.INITIAL);

		JobApplication imported = byNumber(1);
		assertThat(imported.getDeadlineDate()).isNull();
		assertThat(imported.getDeadlineLabel()).isNull();
		assertThat(imported.getNotes()).isNull();
		assertThat(imported.getChannel()).isNull();
	}

	@Test
	void readsTheColumnsByTheirHeadingWhateverTheirOrder() {
		List<String> headers = List.of("#", "Statut", "Poste", "Entreprise", "Groupe", "Envoyée le", "Canal");
		service.importWorkbook(new TestWorkbook()
			.applications(headers, new Object[] { 5, "Entretien", "Stagiaire data", "Fictif Data", "Groupe Fictif",
					LocalDate.of(2026, 9, 20), "JobTeaser" })
			.toInputStream(), ImportMode.INITIAL);

		JobApplication imported = byNumber(5);
		assertThat(imported.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
		assertThat(imported.getJobTitle()).isEqualTo("Stagiaire data");
		assertThat(imported.getCompany()).isEqualTo("Fictif Data");
		assertThat(imported.getChannel()).isEqualTo("JobTeaser");
		assertThat(imported.getCvSent()).isNull();
	}

	@Test
	void stopsAtTheFirstRowWithoutNumberAndIgnoresTheEmployerSheets() {
		ImportResultResponse result = service.importWorkbook(new TestWorkbook()
			.applications(application(1, "Groupe Fictif", "À envoyer", null),
					application(null, "Groupe Fictif", "À envoyer", null),
					application(3, "Groupe Fictif", "À envoyer", null))
			.sheet("Groupe Fictif", new Object[] { "#", "Entreprise" }, new Object[] { 9, "Fictif Aéro" })
			.sheet("Autres", new Object[] { "#", "Entreprise" }, new Object[] { 10, "Fictif Ferroviaire" })
			.toInputStream(), ImportMode.INITIAL);

		assertThat(result.jobApplications()).isEqualTo(1);
		assertThat(applicationRepository.findAllWithCompanyGroup()).extracting(JobApplication::getNumber)
			.containsExactly(1);
	}

	@Test
	void rejectsANumberThatIsNotAWholeNumberCitingTheRow() {
		TestWorkbook workbook = new TestWorkbook().applications(application(1, "Groupe Fictif", "À envoyer", null),
				application("Total", "Groupe Fictif", "À envoyer", null));

		assertThatThrownBy(() -> service.importWorkbook(workbook.toInputStream(), ImportMode.INITIAL))
			.isInstanceOf(InvalidRequestException.class)
			.hasMessage("Import refusé : feuille « Toutes les candidatures », ligne 5 : numéro « Total » invalide.");
		assertThat(applicationRepository.count()).isZero();
	}

	@Test
	void readsANumberInATextColumnAsExcelDisplaysIt() {
		List<String> headers = List.of("#", "Groupe", "Entreprise", "Poste", "Statut", "Début");
		service.importWorkbook(new TestWorkbook()
			.applications(headers, new Object[] { 1, "Groupe Fictif", "Fictif Aéro", "Stagiaire", "À envoyer", 2027 })
			.toInputStream(), ImportMode.INITIAL);

		assertThat(byNumber(1).getStartPeriod()).isEqualTo("2027");
	}

	@Test
	void refusesToImportIntoADatabaseThatAlreadyHasApplicationsAndWritesNothing() {
		service.importWorkbook(new TestWorkbook().applications(application(1, "Groupe Fictif", "À envoyer", null))
			.toInputStream(), ImportMode.INITIAL);

		assertThatThrownBy(() -> service.importWorkbook(new TestWorkbook()
			.applications(application(2, "Autre Groupe", "À envoyer", null))
			.toInputStream(), ImportMode.INITIAL)).isInstanceOf(ConflictException.class)
			.hasMessage("La base contient déjà des candidatures : l'import est refusé.");
		assertThat(applicationRepository.findAllWithCompanyGroup()).extracting(JobApplication::getNumber,
				application -> application.getCompanyGroup().getName())
			.containsExactly(tuple(1, "Groupe Fictif"));
		assertThat(groupRepository.count()).isEqualTo(1);
	}

	private JobApplication byNumber(int number) {
		return applicationRepository.findAllWithCompanyGroup()
			.stream()
			.filter(application -> application.getNumber() == number)
			.findFirst()
			.orElseThrow();
	}

}

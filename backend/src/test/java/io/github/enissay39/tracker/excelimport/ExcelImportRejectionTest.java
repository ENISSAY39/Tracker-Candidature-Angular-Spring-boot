package io.github.enissay39.tracker.excelimport;

import static io.github.enissay39.tracker.excelimport.TestWorkbook.application;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.jobapplication.JobApplicationRepository;
import io.github.enissay39.tracker.joblead.JobLeadRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Chaque anomalie du classeur rejette tout l'import en citant la feuille et la ligne ; la base reste vide et la
 * séquence des numéros n'est pas recalée.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExcelImportRejectionTest {

	private static final String SHEET = "Import refusé : feuille « Toutes les candidatures », ";

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

	private long sequenceBefore;

	@BeforeEach
	void readSequence() {
		sequenceBefore = lastNumberOfSequence();
	}

	@AfterEach
	void emptyDatabase() {
		applicationRepository.deleteAllInBatch();
		leadRepository.deleteAllInBatch();
		groupRepository.deleteAllInBatch();
	}

	@Test
	void anUnknownStatusLabel() {
		assertRejected(new TestWorkbook().applications(valid(1), application(2, "Groupe Fictif", "Envoyée",
				LocalDate.of(2026, 10, 4))), SHEET + "ligne 5 : statut « Envoyée » inconnu.");
	}

	@Test
	void aMissingSentDateWhenTheStatusRequiresOne() {
		assertRejected(new TestWorkbook().applications(valid(1), application(2, "Groupe Fictif", "En attente", null)),
				SHEET + "ligne 5 : « Envoyée le » est vide alors que le statut « En attente » l'exige.");
	}

	@Test
	void aTextCellInASentDateColumn() {
		Object[] row = application(1, "Groupe Fictif", "En attente", null);
		row[5] = "04/10/2026";

		assertRejected(new TestWorkbook().applications(row),
				SHEET + "ligne 4 : « Envoyée le » (cellule F4) n'est pas une date.");
	}

	@Test
	void aTextCellInADeadlineDateColumn() {
		Object[] row = application(1, "Groupe Fictif", "En attente", LocalDate.of(2026, 10, 4));
		row[7] = "18/10";

		assertRejected(new TestWorkbook().applications(row),
				SHEET + "ligne 4 : « Date échéance » (cellule H4) n'est pas une date.");
	}

	@Test
	void aNumberThatIsNotAWholeNumber() {
		assertRejected(new TestWorkbook().applications(application(26.5, "Groupe Fictif", "À envoyer", null)),
				SHEET + "ligne 4 : numéro « 26,5 » invalide.");
	}

	@Test
	void aDuplicatedNumber() {
		assertRejected(new TestWorkbook().applications(valid(7), valid(8), valid(7)),
				SHEET + "ligne 6 : numéro 7 en double (déjà ligne 4).");
	}

	@Test
	void anEmptyGroupCompanyOrJobTitle() {
		assertRejected(new TestWorkbook().applications(application(1, "  ", "À envoyer", null)),
				SHEET + "ligne 4 : « Groupe » est vide.");
		assertRejected(new TestWorkbook().applications(application(1, "Groupe Fictif", null, "Stagiaire", "À envoyer",
				null, null, null, null, null, null, null)), SHEET + "ligne 4 : « Entreprise » est vide.");
		assertRejected(new TestWorkbook().applications(application(1, "Groupe Fictif", "Fictif Aéro", "", "À envoyer",
				null, null, null, null, null, null, null)), SHEET + "ligne 4 : « Poste » est vide.");
	}

	@Test
	void aGroupNameTooLong() {
		assertRejected(new TestWorkbook().applications(application(1, "G".repeat(101), "À envoyer", null)),
				SHEET + "ligne 4 : « Groupe » dépasse 100 caractères (101).");
	}

	@Test
	void aFileThatIsNotAnXlsxWorkbook() {
		assertRejected(new ByteArrayInputStream("#;Groupe\n1;Fictif".getBytes(StandardCharsets.UTF_8)),
				"Le fichier n'est pas un classeur Excel lisible (.xlsx).");
	}

	@Test
	void aMissingApplicationsSheet() {
		assertRejected(new TestWorkbook().sheet("Groupe Fictif", new Object[] { "#", "Entreprise" }),
				"La feuille « Toutes les candidatures » est introuvable dans le classeur.");
	}

	@Test
	void aMissingRequiredColumn() {
		assertRejected(new TestWorkbook().applications(List.of("#", "Groupe", "Entreprise", "Statut"),
				new Object[] { 1, "Groupe Fictif", "Fictif Aéro", "À envoyer" }),
				"Feuille « Toutes les candidatures » : colonne « Poste » introuvable.");
	}

	private static Object[] valid(int number) {
		return application(number, "Groupe Fictif", "À envoyer", null);
	}

	private void assertRejected(TestWorkbook workbook, String message) {
		assertRejected(workbook.toInputStream(), message);
	}

	private void assertRejected(InputStream input, String message) {
		assertThatThrownBy(() -> service.importWorkbook(input, ImportMode.INITIAL)).isInstanceOf(InvalidRequestException.class)
			.hasMessage(message);
		assertThat(applicationRepository.count()).isZero();
		assertThat(groupRepository.count()).isZero();
		assertThat(lastNumberOfSequence()).isEqualTo(sequenceBefore);
	}

	private long lastNumberOfSequence() {
		return jdbcTemplate.queryForObject("select last_value from job_application_number_seq", Long.class);
	}

}

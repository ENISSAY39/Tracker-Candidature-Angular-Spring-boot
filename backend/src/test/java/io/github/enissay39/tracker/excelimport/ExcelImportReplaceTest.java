package io.github.enissay39.tracker.excelimport;

import static io.github.enissay39.tracker.excelimport.TestWorkbook.application;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import io.github.enissay39.tracker.jobapplication.JobApplication;
import io.github.enissay39.tracker.jobapplication.JobApplicationRepository;
import io.github.enissay39.tracker.joblead.JobLead;
import io.github.enissay39.tracker.joblead.JobLeadRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Mode remplacement (ADR 0002) : candidatures, pistes et groupes sont remplacés par ceux du classeur, seulement si
 * le nouveau classeur est accepté en entier.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExcelImportReplaceTest {

	@Autowired
	private ExcelImportService service;

	@Autowired
	private JobApplicationRepository applicationRepository;

	@Autowired
	private CompanyGroupRepository groupRepository;

	@Autowired
	private JobLeadRepository leadRepository;

	@BeforeEach
	void importAFirstWorkbook() {
		service.importWorkbook(new TestWorkbook()
			.applications(application(12, "Ancien Groupe", "À envoyer", null),
					application(40, "Groupe Fictif", "À envoyer", null))
			.toEvaluate(new Object[] { "Ancienne Piste", "Stagiaire" })
			.toInputStream(), ImportMode.INITIAL);
	}

	@AfterEach
	void emptyDatabase() {
		applicationRepository.deleteAllInBatch();
		leadRepository.deleteAllInBatch();
		groupRepository.deleteAllInBatch();
	}

	@Test
	void replacesApplicationsLeadsAndGroupsWithThoseOfTheNewWorkbook() {
		ImportResultResponse result = service.importWorkbook(new TestWorkbook()
			.applications(application(3, "GROUPE FICTIF", "À envoyer", null),
					application(5, "Nouveau Groupe", "À envoyer", null))
			.toEvaluate(new Object[] { "Nouvelle Piste", "Stagiaire data" })
			.toInputStream(), ImportMode.REPLACE);

		assertThat(result).isEqualTo(new ImportResultResponse(2, 2, 1));
		assertThat(applicationRepository.findAllWithCompanyGroup()).extracting(JobApplication::getNumber)
			.containsExactly(3, 5);
		// La graphie du nouveau classeur l'emporte : l'ancien groupe a été supprimé avant le chargement
		assertThat(groupRepository.findAllOrderedByName()).extracting(CompanyGroup::getName)
			.containsExactly("GROUPE FICTIF", "Nouveau Groupe");
		assertThat(leadRepository.findAll()).extracting(JobLead::getCompany).containsExactly("Nouvelle Piste");
	}

	@Test
	void givesTheNextNumberAfterTheHighestOneOfTheNewWorkbook() {
		service.importWorkbook(new TestWorkbook().applications(application(5, "Groupe Fictif", "À envoyer", null))
			.toInputStream(), ImportMode.REPLACE);

		assertThat(applicationRepository.nextNumber()).isEqualTo(6);
	}

	@Test
	void keepsTheFormerDataWhenTheNewWorkbookIsRejected() {
		TestWorkbook rejected = new TestWorkbook()
			.applications(application(3, "Groupe Fictif", "Statut inconnu", null));

		assertThatThrownBy(() -> service.importWorkbook(rejected.toInputStream(), ImportMode.REPLACE))
			.isInstanceOf(InvalidRequestException.class);
		assertThat(applicationRepository.findAllWithCompanyGroup()).extracting(JobApplication::getNumber)
			.containsExactly(12, 40);
		assertThat(groupRepository.count()).isEqualTo(2);
		assertThat(leadRepository.findAll()).extracting(JobLead::getCompany).containsExactly("Ancienne Piste");
	}

	@Test
	void stillRefusesAnInitialImportIntoADatabaseWithApplications() {
		assertThatThrownBy(() -> service.importWorkbook(new TestWorkbook()
			.applications(application(3, "Groupe Fictif", "À envoyer", null))
			.toInputStream(), ImportMode.INITIAL)).isInstanceOf(ConflictException.class);
		assertThat(applicationRepository.count()).isEqualTo(2);
	}

}

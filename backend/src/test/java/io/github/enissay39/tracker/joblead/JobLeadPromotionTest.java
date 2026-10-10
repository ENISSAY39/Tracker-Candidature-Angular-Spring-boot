package io.github.enissay39.tracker.joblead;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import io.github.enissay39.tracker.jobapplication.JobApplication;
import io.github.enissay39.tracker.jobapplication.JobApplicationRepository;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import io.github.enissay39.tracker.joblead.dto.PromoteLeadRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Promotion d'une piste sur une vraie base : la candidature et la suppression de la piste vont ensemble, ou rien.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class JobLeadPromotionTest {

	@Autowired
	private JobLeadService service;

	@Autowired
	private JobLeadRepository leadRepository;

	@Autowired
	private JobApplicationRepository applicationRepository;

	@Autowired
	private CompanyGroupRepository groupRepository;

	@AfterEach
	void emptyDatabase() {
		applicationRepository.deleteAllInBatch();
		leadRepository.deleteAllInBatch();
		groupRepository.deleteAllInBatch();
	}

	@Test
	void promotionCreatesTheApplicationAndRemovesTheLead() {
		JobLead lead = new JobLead("Fictif Aéro", "Stagiaire logiciel");
		lead.setPlannedCv("CV_Test.pdf");
		lead.setRemark("Annonce fictive repérée le 01/10.\nÀ relire.");
		Long id = leadRepository.save(lead).getId();

		JobApplicationResponse created = service.promote(id, new PromoteLeadRequest(" Groupe Fictif "));

		assertThat(leadRepository.existsById(id)).isFalse();
		JobApplication application = applicationRepository.findById(created.id()).orElseThrow();
		assertThat(application.getNumber()).isEqualTo(created.number()).isPositive();
		assertThat(application.getStatus()).isEqualTo(ApplicationStatus.TO_SEND);
		assertThat(application.getCompany()).isEqualTo("Fictif Aéro");
		assertThat(application.getJobTitle()).isEqualTo("Stagiaire logiciel");
		assertThat(application.getCvSent()).isEqualTo("CV_Test.pdf");
		assertThat(application.getNotes()).isEqualTo("Annonce fictive repérée le 01/10.\nÀ relire.");
		assertThat(application.getSentOn()).isNull();
		assertThat(created.groupName()).isEqualTo("Groupe Fictif");
	}

	@Test
	void aFailedCreationLeavesTheLeadInPlace() {
		Long id = leadRepository.save(new JobLead("Fictif Aéro", "Stagiaire logiciel")).getId();
		// Plus long que la colonne du nom de groupe : la base refuse la création (la validation HTTP est contournée)
		PromoteLeadRequest tooLongGroup = new PromoteLeadRequest("G".repeat(101));

		assertThatThrownBy(() -> service.promote(id, tooLongGroup))
			.isInstanceOf(DataIntegrityViolationException.class);

		assertThat(leadRepository.existsById(id)).isTrue();
		assertThat(applicationRepository.count()).isZero();
		assertThat(groupRepository.count()).isZero();
	}

}

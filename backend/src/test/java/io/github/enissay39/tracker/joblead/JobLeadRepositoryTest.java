package io.github.enissay39.tracker.joblead;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@Import(TestcontainersConfiguration.class)
class JobLeadRepositoryTest {

	@Autowired
	private JobLeadRepository repository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void savesAndReadsBackALeadToEvaluate() {
		JobLead lead = new JobLead("Fictif Aéro - Bureau d'études, Ville-Test",
				"Stagiaire ingénieur logiciel (réf. TEST-001)");
		lead.setPlannedCv("CV_Test.pdf");
		lead.setRemark("Annonce fictive repérée le 01/10.\nÀ comparer avec une autre piste.");
		Long id = repository.saveAndFlush(lead).getId();
		entityManager.clear();

		JobLead found = repository.findById(id).orElseThrow();

		assertThat(found.getCompany()).isEqualTo("Fictif Aéro - Bureau d'études, Ville-Test");
		assertThat(found.getJobTitle()).isEqualTo("Stagiaire ingénieur logiciel (réf. TEST-001)");
		assertThat(found.getPlannedCv()).isEqualTo("CV_Test.pdf");
		assertThat(found.getRemark()).isEqualTo("Annonce fictive repérée le 01/10.\nÀ comparer avec une autre piste.");
		assertThat(found.getState()).isEqualTo(LeadState.TO_EVALUATE);
		assertThat(found.getDiscardReason()).isNull();
	}

	@Test
	void savesADiscardedLeadWithItsReasonAndKeepsPlannedCvAndRemark() {
		JobLead lead = discardedLead("Trop loin de Ville-Test");
		lead.setPlannedCv("CV_Test.pdf");
		lead.setRemark("Annonce fictive");
		Long id = repository.saveAndFlush(lead).getId();
		entityManager.clear();

		JobLead found = repository.findById(id).orElseThrow();

		assertThat(found.getState()).isEqualTo(LeadState.DISCARDED);
		assertThat(found.getDiscardReason()).isEqualTo("Trop loin de Ville-Test");
		assertThat(found.getPlannedCv()).isEqualTo("CV_Test.pdf");
		assertThat(found.getRemark()).isEqualTo("Annonce fictive");
	}

	@Test
	void rejectsADiscardedLeadWithoutReason() {
		assertThatThrownBy(() -> repository.saveAndFlush(discardedLead(null)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "   ", " \t\n" })
	void rejectsADiscardedLeadWithABlankReason(String reason) {
		assertThatThrownBy(() -> repository.saveAndFlush(discardedLead(reason)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "Trop loin de Ville-Test", "", "   " })
	void rejectsALeadToEvaluateWithAReason(String reason) {
		JobLead lead = lead();
		lead.setDiscardReason(reason);

		assertThatThrownBy(() -> repository.saveAndFlush(lead)).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rejectsAnUnknownStateInsertedWithSql() {
		String insert = "INSERT INTO job_lead (company, job_title, state) VALUES ('Fictif Aéro', 'Stagiaire', ?)";
		assertThat(jdbcTemplate.update(insert, "TO_EVALUATE")).isEqualTo(1);

		assertThatThrownBy(() -> jdbcTemplate.update(insert, "UNKNOWN"))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void listsLeadsByState() {
		JobLead toEvaluate = repository.saveAndFlush(lead());
		JobLead discarded = repository.saveAndFlush(discardedLead("Trop loin de Ville-Test"));
		entityManager.clear();

		assertThat(repository.findByState(LeadState.TO_EVALUATE)).extracting(JobLead::getId)
			.containsExactly(toEvaluate.getId());
		assertThat(repository.findByState(LeadState.DISCARDED)).extracting(JobLead::getId)
			.containsExactly(discarded.getId());
	}

	@Test
	void setsCreationAndModificationDatesFromTheEntity() {
		Instant before = Instant.now();
		JobLead lead = repository.saveAndFlush(lead());
		Instant createdAt = lead.getCreatedAt();
		assertThat(createdAt).isAfterOrEqualTo(before);
		assertThat(lead.getUpdatedAt()).isEqualTo(createdAt);

		lead.setRemark("Mise à jour fictive");
		repository.saveAndFlush(lead);

		assertThat(lead.getCreatedAt()).isEqualTo(createdAt);
		assertThat(lead.getUpdatedAt()).isAfter(createdAt);
	}

	private JobLead lead() {
		return new JobLead("Fictif Aéro", "Stagiaire ingénieur logiciel");
	}

	private JobLead discardedLead(String reason) {
		JobLead lead = lead();
		lead.setState(LeadState.DISCARDED);
		lead.setDiscardReason(reason);
		return lead;
	}

}

package io.github.enissay39.tracker.jobapplication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import io.github.enissay39.tracker.TestcontainersConfiguration;
import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest
@Import(TestcontainersConfiguration.class)
class JobApplicationRepositoryTest {

	@Autowired
	private JobApplicationRepository repository;

	@Autowired
	private CompanyGroupRepository groupRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private CompanyGroup group;

	@BeforeEach
	void createGroup() {
		group = groupRepository.saveAndFlush(new CompanyGroup("Groupe Fictif"));
	}

	@Test
	void savesAndReadsBackEveryFieldWithItsGroup() {
		JobApplication application = new JobApplication(26, group, "Fictif Aéro - Bureau d'études, Ville-Test",
				"Stagiaire ingénieur logiciel (réf. TEST-001)", ApplicationStatus.PENDING);
		application.setSentOn(LocalDate.of(2026, 10, 4));
		application.setDeadlineLabel("Relance le 18/10");
		application.setDeadlineDate(LocalDate.of(2026, 10, 18));
		application.setNotes("04/10 : candidature déposée.\nÀ relancer si pas de réponse.");
		application.setStartPeriod("Févr. 2027, 6 mois");
		application.setChannel("Site carrière");
		application.setCvSent("CV_Test.pdf, LM_Test.pdf");
		Long id = repository.saveAndFlush(application).getId();
		entityManager.clear();

		JobApplication found = repository.findById(id).orElseThrow();

		assertThat(found.getNumber()).isEqualTo(26);
		assertThat(found.getCompanyGroup().getName()).isEqualTo("Groupe Fictif");
		assertThat(found.getCompany()).isEqualTo("Fictif Aéro - Bureau d'études, Ville-Test");
		assertThat(found.getJobTitle()).isEqualTo("Stagiaire ingénieur logiciel (réf. TEST-001)");
		assertThat(found.getStatus()).isEqualTo(ApplicationStatus.PENDING);
		assertThat(found.getSentOn()).isEqualTo(LocalDate.of(2026, 10, 4));
		assertThat(found.getDeadlineLabel()).isEqualTo("Relance le 18/10");
		assertThat(found.getDeadlineDate()).isEqualTo(LocalDate.of(2026, 10, 18));
		assertThat(found.getNotes()).isEqualTo("04/10 : candidature déposée.\nÀ relancer si pas de réponse.");
		assertThat(found.getStartPeriod()).isEqualTo("Févr. 2027, 6 mois");
		assertThat(found.getChannel()).isEqualTo("Site carrière");
		assertThat(found.getCvSent()).isEqualTo("CV_Test.pdf, LM_Test.pdf");
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(found.getUpdatedAt()).isNotNull();
	}

	@Test
	void rejectsTwoApplicationsWithTheSameNumber() {
		repository.saveAndFlush(application(7, ApplicationStatus.TO_SEND));

		assertThatThrownBy(() -> repository.saveAndFlush(application(7, ApplicationStatus.TO_SEND)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void keepsTheNumberWhenTheApplicationIsUpdated() {
		Long id = repository.saveAndFlush(application(26, ApplicationStatus.TO_SEND)).getId();
		entityManager.clear();

		JobApplication loaded = repository.findById(id).orElseThrow();
		loaded.setCompany("Fictif Aéro - autre site");
		// aucun setter : on force le champ pour prouver que la mise à jour n'écrit jamais la colonne
		ReflectionTestUtils.setField(loaded, "number", 99);
		repository.saveAndFlush(loaded);
		entityManager.clear();

		JobApplication reloaded = repository.findById(id).orElseThrow();
		assertThat(reloaded.getCompany()).isEqualTo("Fictif Aéro - autre site");
		assertThat(reloaded.getNumber()).isEqualTo(26);
	}

	@Test
	void givesADifferentNumberOnEachReadOfTheSequence() {
		int first = repository.nextNumber();
		int second = repository.nextNumber();

		assertThat(second).isGreaterThan(first);
	}

	@ParameterizedTest
	@EnumSource(names = { "REJECTED", "WITHDRAWN" })
	void rejectsAClosedApplicationWithADeadlineDate(ApplicationStatus closedStatus) {
		JobApplication application = application(1, closedStatus);
		application.setSentOn(LocalDate.of(2026, 9, 1));
		application.setDeadlineDate(LocalDate.of(2026, 9, 15));

		assertThatThrownBy(() -> repository.saveAndFlush(application))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@EnumSource(names = { "REJECTED", "WITHDRAWN" })
	void acceptsAClosedApplicationWithoutDeadlineDate(ApplicationStatus closedStatus) {
		JobApplication saved = repository.saveAndFlush(application(1, closedStatus));

		assertThat(saved.getId()).isNotNull();
	}

	// ADR 0001 : aucune contrainte en base sur sent_on, quel que soit le statut
	@ParameterizedTest
	@EnumSource(names = { "TO_SEND", "PENDING" })
	void acceptsAnApplicationWithoutSentDate(ApplicationStatus status) {
		JobApplication saved = repository.saveAndFlush(application(1, status));
		entityManager.clear();

		assertThat(repository.findById(saved.getId()).orElseThrow().getSentOn()).isNull();
	}

	@Test
	void rejectsAnUnknownStatusInsertedWithSql() {
		String insert = "INSERT INTO job_application (number, company_group_id, company, job_title, status) "
				+ "VALUES (?, ?, 'Fictif Aéro', 'Stagiaire', ?)";
		assertThat(jdbcTemplate.update(insert, 1, group.getId(), "TO_SEND")).isEqualTo(1);

		assertThatThrownBy(() -> jdbcTemplate.update(insert, 2, group.getId(), "UNKNOWN"))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rejectsDeletingAGroupThatHasAnApplication() {
		repository.saveAndFlush(application(1, ApplicationStatus.TO_SEND));
		entityManager.clear();

		assertThatThrownBy(() -> {
			groupRepository.deleteById(group.getId());
			groupRepository.flush();
		}).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void tellsWhetherAGroupHasApplications() {
		CompanyGroup emptyGroup = groupRepository.saveAndFlush(new CompanyGroup("Groupe Vide"));
		repository.saveAndFlush(application(1, ApplicationStatus.TO_SEND));

		assertThat(repository.existsByCompanyGroupId(group.getId())).isTrue();
		assertThat(repository.existsByCompanyGroupId(emptyGroup.getId())).isFalse();
	}

	@Test
	void readsAllApplicationsWithTheirGroupAlreadyLoaded() {
		CompanyGroup otherGroup = groupRepository.saveAndFlush(new CompanyGroup("Autre Groupe"));
		repository.saveAndFlush(application(1, ApplicationStatus.TO_SEND));
		repository.saveAndFlush(
				new JobApplication(2, otherGroup, "Autre Fictif", "Stagiaire data", ApplicationStatus.TO_SEND));
		entityManager.clear();

		List<JobApplication> applications = repository.findAllWithCompanyGroup();

		assertThat(applications).hasSize(2)
			.allSatisfy(application -> assertThat(isLoaded(application.getCompanyGroup())).isTrue());
		assertThat(applications).extracting(application -> application.getCompanyGroup().getName())
			.containsExactlyInAnyOrder("Groupe Fictif", "Autre Groupe");
	}

	@Test
	void readsAllApplicationsOrderedByNumber() {
		repository.saveAndFlush(application(3, ApplicationStatus.TO_SEND));
		repository.saveAndFlush(application(1, ApplicationStatus.TO_SEND));
		repository.saveAndFlush(application(2, ApplicationStatus.TO_SEND));
		entityManager.clear();

		assertThat(repository.findAllWithCompanyGroup()).extracting(JobApplication::getNumber).containsExactly(1, 2, 3);
	}

	@Test
	void setsCreationAndModificationDatesFromTheEntity() {
		Instant before = Instant.now();
		JobApplication application = repository.saveAndFlush(application(1, ApplicationStatus.TO_SEND));
		Instant createdAt = application.getCreatedAt();
		assertThat(createdAt).isAfterOrEqualTo(before);
		assertThat(application.getUpdatedAt()).isEqualTo(createdAt);

		application.setNotes("Mise à jour fictive");
		repository.saveAndFlush(application);

		assertThat(application.getCreatedAt()).isEqualTo(createdAt);
		assertThat(application.getUpdatedAt()).isAfter(createdAt);
	}

	private boolean isLoaded(Object entity) {
		return entityManager.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(entity);
	}

	private JobApplication application(int number, ApplicationStatus status) {
		return new JobApplication(number, group, "Fictif Aéro", "Stagiaire ingénieur logiciel", status);
	}

}

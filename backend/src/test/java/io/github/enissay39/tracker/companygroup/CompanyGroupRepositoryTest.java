package io.github.enissay39.tracker.companygroup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
class CompanyGroupRepositoryTest {

	@Autowired
	private CompanyGroupRepository repository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void savesAndReadsBackAGroup() {
		CompanyGroup saved = repository.saveAndFlush(new CompanyGroup("Groupe Fictif"));
		entityManager.clear();

		assertThat(repository.findById(saved.getId())).get().extracting(CompanyGroup::getName).isEqualTo("Groupe Fictif");
	}

	@Test
	void rejectsTwoGroupsWhoseNamesDifferOnlyByCase() {
		repository.saveAndFlush(new CompanyGroup("Groupe Fictif"));

		assertThatThrownBy(() -> repository.saveAndFlush(new CompanyGroup("GROUPE fictif")))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "   ", " Groupe Fictif", "Groupe Fictif " })
	void rejectsAnEmptyNameOrANameWithSurroundingSpaces(String name) {
		assertThatThrownBy(() -> repository.saveAndFlush(new CompanyGroup(name)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void findsAGroupByNameIgnoringCase() {
		repository.saveAndFlush(new CompanyGroup("Groupe Fictif"));
		entityManager.clear();

		assertThat(repository.findByNameIgnoreCase("gROUPE FICTIF")).get()
			.extracting(CompanyGroup::getName)
			.isEqualTo("Groupe Fictif");
		assertThat(repository.findByNameIgnoreCase("Autre Groupe")).isEmpty();
	}

	@Test
	void listsGroupsByNameIgnoringCase() {
		repository.saveAndFlush(new CompanyGroup("bêta Fictif"));
		repository.saveAndFlush(new CompanyGroup("Gamma Fictif"));
		repository.saveAndFlush(new CompanyGroup("Alpha Fictif"));
		entityManager.clear();

		assertThat(repository.findAllOrderedByName()).extracting(CompanyGroup::getName)
			.containsExactly("Alpha Fictif", "bêta Fictif", "Gamma Fictif");
	}

	@Test
	void tellsWhetherAGroupHasApplications() {
		CompanyGroup used = repository.saveAndFlush(new CompanyGroup("Groupe Fictif"));
		CompanyGroup empty = repository.saveAndFlush(new CompanyGroup("Groupe Vide"));
		jdbcTemplate.update("INSERT INTO job_application (number, company_group_id, company, job_title, status) "
				+ "VALUES (1, ?, 'Fictif Aéro', 'Stagiaire', 'TO_SEND')", used.getId());

		assertThat(repository.hasApplications(used.getId())).isTrue();
		assertThat(repository.hasApplications(empty.getId())).isFalse();
	}

}

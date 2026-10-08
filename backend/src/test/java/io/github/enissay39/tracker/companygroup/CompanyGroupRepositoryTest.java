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

@DataJpaTest
@Import(TestcontainersConfiguration.class)
class CompanyGroupRepositoryTest {

	@Autowired
	private CompanyGroupRepository repository;

	@Autowired
	private TestEntityManager entityManager;

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

}

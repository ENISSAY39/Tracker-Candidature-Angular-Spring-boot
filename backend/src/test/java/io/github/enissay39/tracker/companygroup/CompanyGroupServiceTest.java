package io.github.enissay39.tracker.companygroup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupRequest;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CompanyGroupServiceTest {

	@Mock
	private CompanyGroupRepository repository;

	private CompanyGroupService service;

	@BeforeEach
	void createService() {
		service = new CompanyGroupService(repository);
	}

	@Test
	void findAllGivesEveryGroupInTheRepositoryOrder() {
		when(repository.findAllOrderedByName())
			.thenReturn(List.of(group(1L, "Alpha Fictif"), group(2L, "bêta Fictif")));

		assertThat(service.findAll()).containsExactly(new CompanyGroupResponse(1L, "Alpha Fictif"),
				new CompanyGroupResponse(2L, "bêta Fictif"));
	}

	@Test
	void renameStoresTheNameWithoutItsSurroundingSpaces() {
		CompanyGroup group = group(3L, "Groupe Fictif");
		when(repository.findById(3L)).thenReturn(Optional.of(group));

		CompanyGroupResponse renamed = service.rename(3L, new CompanyGroupRequest("  Groupe Renommé "));

		assertThat(renamed).isEqualTo(new CompanyGroupResponse(3L, "Groupe Renommé"));
		assertThat(group.getName()).isEqualTo("Groupe Renommé");
	}

	@Test
	void renameToTheNameOfAnotherGroupIsAConflictWithoutMerge() {
		CompanyGroup group = group(3L, "Groupe Fictif");
		when(repository.findById(3L)).thenReturn(Optional.of(group));
		when(repository.findByNameIgnoreCase("autre groupe")).thenReturn(Optional.of(group(4L, "Autre Groupe")));

		assertThatThrownBy(() -> service.rename(3L, new CompanyGroupRequest("autre groupe")))
			.isInstanceOf(ConflictException.class)
			.hasMessage("Le groupe « Autre Groupe » existe déjà.");
		assertThat(group.getName()).isEqualTo("Groupe Fictif");
	}

	@Test
	void renameMayChangeOnlyTheCaseOfTheSameGroup() {
		CompanyGroup group = group(3L, "groupe fictif");
		when(repository.findById(3L)).thenReturn(Optional.of(group));
		when(repository.findByNameIgnoreCase("Groupe Fictif")).thenReturn(Optional.of(group));

		CompanyGroupResponse renamed = service.rename(3L, new CompanyGroupRequest("Groupe Fictif"));

		assertThat(renamed.name()).isEqualTo("Groupe Fictif");
	}

	@Test
	void renameOfAnUnknownGroupIsNotFound() {
		assertThatThrownBy(() -> service.rename(42L, new CompanyGroupRequest("Groupe Fictif")))
			.isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Groupe 42 introuvable.");
	}

	@Test
	void deleteRemovesAGroupWithoutApplications() {
		CompanyGroup group = group(3L, "Groupe Vide");
		when(repository.findById(3L)).thenReturn(Optional.of(group));

		service.delete(3L);

		verify(repository).delete(group);
	}

	@Test
	void deleteOfAGroupWithApplicationsIsAConflict() {
		when(repository.findById(3L)).thenReturn(Optional.of(group(3L, "Groupe Fictif")));
		when(repository.hasApplications(3L)).thenReturn(true);

		assertThatThrownBy(() -> service.delete(3L)).isInstanceOf(ConflictException.class)
			.hasMessage("Le groupe « Groupe Fictif » a des candidatures : il ne peut pas être supprimé.");
		verify(repository, never()).delete(any());
	}

	@Test
	void deleteOfAnUnknownGroupIsNotFound() {
		assertThatThrownBy(() -> service.delete(42L)).isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Groupe 42 introuvable.");
	}

	private static CompanyGroup group(Long id, String name) {
		CompanyGroup group = new CompanyGroup(name);
		// identifiant posé par la base en vrai
		ReflectionTestUtils.setField(group, "id", id);
		return group;
	}

}

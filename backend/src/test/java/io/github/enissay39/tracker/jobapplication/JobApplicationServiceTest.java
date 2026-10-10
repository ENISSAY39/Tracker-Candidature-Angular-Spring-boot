package io.github.enissay39.tracker.jobapplication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import io.github.enissay39.tracker.common.FieldRuleViolationException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.companygroup.CompanyGroupRepository;
import io.github.enissay39.tracker.companygroup.CompanyGroupService;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

	@Mock
	private JobApplicationRepository repository;

	@Mock
	private CompanyGroupRepository groupRepository;

	private JobApplicationService service;

	@BeforeEach
	void createService() {
		service = new JobApplicationService(repository, new CompanyGroupService(groupRepository));
	}

	@Test
	void createGivesTheNextNumberOfTheSequenceAndCreatesAnUnknownGroup() {
		when(repository.nextNumber()).thenReturn(27);
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(request("Groupe Fictif", ApplicationStatus.PENDING));

		assertThat(created.number()).isEqualTo(27);
		assertThat(created.groupName()).isEqualTo("Groupe Fictif");
		assertThat(created.company()).isEqualTo("Fictif Aéro");
		assertThat(created.jobTitle()).isEqualTo("Stagiaire ingénieur logiciel");
		assertThat(created.status()).isEqualTo(ApplicationStatus.PENDING);
		assertThat(created.sentOn()).isEqualTo(LocalDate.of(2026, 10, 4));
	}

	@Test
	void createReusesTheGroupFoundIgnoringCaseAndSurroundingSpacesWithoutChangingItsName() {
		CompanyGroup existing = new CompanyGroup("Groupe Fictif");
		when(groupRepository.findByNameIgnoreCase("GROUPE FICTIF")).thenReturn(Optional.of(existing));
		when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		JobApplicationResponse created = service.create(request("  GROUPE FICTIF  ", ApplicationStatus.PENDING));

		assertThat(created.groupName()).isEqualTo("Groupe Fictif");
		verify(groupRepository, never()).save(any());
	}

	@Test
	void createStoresAnUnknownGroupWithoutItsSurroundingSpaces() {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(request("  Nouveau Groupe ", ApplicationStatus.PENDING));

		assertThat(created.groupName()).isEqualTo("Nouveau Groupe");
	}

	@ParameterizedTest
	@EnumSource(names = { "TO_SEND", "WITHDRAWN" }, mode = EnumSource.Mode.EXCLUDE)
	void createRefusesAStatusThatRequiresASentDateWithoutOne(ApplicationStatus status) {
		JobApplicationRequest withoutSentOn = request("Groupe Fictif", status, null, null);

		assertThatThrownBy(() -> service.create(withoutSentOn)).isInstanceOf(FieldRuleViolationException.class)
			.hasMessage("La date d'envoi est obligatoire pour ce statut.")
			.extracting("field")
			.isEqualTo("sentOn");
	}

	@ParameterizedTest
	@EnumSource(names = { "TO_SEND", "WITHDRAWN" })
	void createAcceptsAnApplicationNeverSentWithoutSentDate(ApplicationStatus status) {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(request("Groupe Fictif", status, null, null));

		assertThat(created.status()).isEqualTo(status);
		assertThat(created.sentOn()).isNull();
	}

	@ParameterizedTest
	@EnumSource(names = { "REJECTED", "WITHDRAWN" })
	void createDropsTheDeadlineDateOfAClosedApplication(ApplicationStatus closedStatus) {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(
				request("Groupe Fictif", closedStatus, LocalDate.of(2026, 10, 4), LocalDate.of(2026, 10, 18)));

		assertThat(created.deadlineDate()).isNull();
	}

	@Test
	void createKeepsTheDeadlineDateOfAnOpenApplication() {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(request("Groupe Fictif", ApplicationStatus.PENDING,
				LocalDate.of(2026, 10, 4), LocalDate.of(2026, 10, 18)));

		assertThat(created.deadlineDate()).isEqualTo(LocalDate.of(2026, 10, 18));
	}

	@Test
	void createStoresEveryTextWithoutItsSurroundingSpaces() {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(new JobApplicationRequest("Groupe Fictif", " Fictif Aéro ",
				" Stagiaire ingénieur logiciel\n", ApplicationStatus.PENDING, LocalDate.of(2026, 10, 4),
				" Relance le 18/10 ", null, "\n04/10 : candidature déposée.\nÀ relancer.\n", " Févr. 2027, 6 mois ",
				" Site carrière ", " CV_Test.pdf "));

		assertThat(created.company()).isEqualTo("Fictif Aéro");
		assertThat(created.jobTitle()).isEqualTo("Stagiaire ingénieur logiciel");
		assertThat(created.deadlineLabel()).isEqualTo("Relance le 18/10");
		assertThat(created.notes()).isEqualTo("04/10 : candidature déposée.\nÀ relancer.");
		assertThat(created.startPeriod()).isEqualTo("Févr. 2027, 6 mois");
		assertThat(created.channel()).isEqualTo("Site carrière");
		assertThat(created.cvSent()).isEqualTo("CV_Test.pdf");
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "   ", " \t\n" })
	void createStoresAnEmptyOptionalTextAsNull(String empty) {
		savedEntitiesAreReturnedAsIs();

		JobApplicationResponse created = service.create(new JobApplicationRequest("Groupe Fictif", "Fictif Aéro",
				"Stagiaire ingénieur logiciel", ApplicationStatus.PENDING, LocalDate.of(2026, 10, 4), empty, null,
				empty, empty, empty, empty));

		assertThat(created.deadlineLabel()).isNull();
		assertThat(created.notes()).isNull();
		assertThat(created.startPeriod()).isNull();
		assertThat(created.channel()).isNull();
		assertThat(created.cvSent()).isNull();
	}

	@Test
	void findByIdGivesTheApplicationWithItsGroup() {
		JobApplication application = new JobApplication(26, new CompanyGroup("Groupe Fictif"), "Fictif Aéro",
				"Stagiaire ingénieur logiciel", ApplicationStatus.TO_SEND);
		when(repository.findById(5L)).thenReturn(Optional.of(application));

		JobApplicationResponse found = service.findById(5L);

		assertThat(found.number()).isEqualTo(26);
		assertThat(found.groupName()).isEqualTo("Groupe Fictif");
	}

	@Test
	void findByIdOfAnUnknownApplicationIsNotFound() {
		assertThatThrownBy(() -> service.findById(42L)).isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Candidature 42 introuvable.");
	}

	@Test
	void findAllGivesEveryApplicationWithItsGroup() {
		CompanyGroup group = new CompanyGroup("Groupe Fictif");
		when(repository.findAllWithCompanyGroup()).thenReturn(List.of(
				new JobApplication(1, group, "Fictif Aéro", "Stagiaire logiciel", ApplicationStatus.TO_SEND),
				new JobApplication(2, new CompanyGroup("Autre Groupe"), "Autre Fictif", "Stagiaire data",
						ApplicationStatus.TO_SEND)));

		assertThat(service.findAll()).extracting(JobApplicationResponse::number, JobApplicationResponse::groupName)
			.containsExactly(tuple(1, "Groupe Fictif"), tuple(2, "Autre Groupe"));
	}

	@Test
	void updateReplacesEveryFieldAndKeepsTheNumber() {
		JobApplication existing = existingApplication();
		existing.setNotes("Ancienne note");
		existing.setChannel("JobTeaser");
		when(repository.findById(5L)).thenReturn(Optional.of(existing));
		when(groupRepository.findByNameIgnoreCase("Groupe Fictif")).thenReturn(Optional.of(existing.getCompanyGroup()));

		JobApplicationResponse updated = service.update(5L, new JobApplicationRequest("Groupe Fictif",
				" Fictif Aéro - autre site ", "Stagiaire data", ApplicationStatus.INTERVIEW, LocalDate.of(2026, 10, 4),
				"Entretien le 20/10", LocalDate.of(2026, 10, 20), "Entretien planifié.", "Mars 2027, 6 mois", null,
				"CV_Data.pdf"));

		assertThat(updated.number()).isEqualTo(26);
		assertThat(updated.company()).isEqualTo("Fictif Aéro - autre site");
		assertThat(updated.jobTitle()).isEqualTo("Stagiaire data");
		assertThat(updated.status()).isEqualTo(ApplicationStatus.INTERVIEW);
		assertThat(updated.sentOn()).isEqualTo(LocalDate.of(2026, 10, 4));
		assertThat(updated.deadlineLabel()).isEqualTo("Entretien le 20/10");
		assertThat(updated.deadlineDate()).isEqualTo(LocalDate.of(2026, 10, 20));
		assertThat(updated.notes()).isEqualTo("Entretien planifié.");
		assertThat(updated.startPeriod()).isEqualTo("Mars 2027, 6 mois");
		assertThat(updated.channel()).isNull();
		assertThat(updated.cvSent()).isEqualTo("CV_Data.pdf");
	}

	@Test
	void updateMovesTheApplicationToAnotherGroupCreatedIfUnknown() {
		JobApplication existing = existingApplication();
		when(repository.findById(5L)).thenReturn(Optional.of(existing));
		when(groupRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		JobApplicationResponse updated = service.update(5L, request(" Nouveau Groupe ", ApplicationStatus.TO_SEND));

		assertThat(updated.groupName()).isEqualTo("Nouveau Groupe");
		verify(groupRepository, never()).delete(any());
	}

	@Test
	void updateRefusesAStatusThatRequiresASentDateWithoutOne() {
		when(repository.findById(5L)).thenReturn(Optional.of(existingApplication()));

		assertThatThrownBy(() -> service.update(5L, request("Groupe Fictif", ApplicationStatus.PENDING, null, null)))
			.isInstanceOf(FieldRuleViolationException.class)
			.extracting("field")
			.isEqualTo("sentOn");
	}

	@Test
	void updateDropsTheDeadlineDateWhenTheApplicationIsClosed() {
		JobApplication existing = existingApplication();
		existing.setDeadlineDate(LocalDate.of(2026, 10, 18));
		when(repository.findById(5L)).thenReturn(Optional.of(existing));
		when(groupRepository.findByNameIgnoreCase("Groupe Fictif")).thenReturn(Optional.of(existing.getCompanyGroup()));

		JobApplicationResponse updated = service.update(5L, request("Groupe Fictif", ApplicationStatus.REJECTED,
				LocalDate.of(2026, 10, 4), LocalDate.of(2026, 10, 18)));

		assertThat(updated.deadlineDate()).isNull();
	}

	@Test
	void updateOfAnUnknownApplicationIsNotFound() {
		assertThatThrownBy(() -> service.update(42L, request("Groupe Fictif", ApplicationStatus.TO_SEND)))
			.isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Candidature 42 introuvable.");
	}

	@Test
	void deleteRemovesTheApplication() {
		JobApplication existing = existingApplication();
		when(repository.findById(5L)).thenReturn(Optional.of(existing));

		service.delete(5L);

		verify(repository).delete(existing);
	}

	@Test
	void deleteOfAnUnknownApplicationIsNotFound() {
		assertThatThrownBy(() -> service.delete(42L)).isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Candidature 42 introuvable.");
	}

	private JobApplication existingApplication() {
		return new JobApplication(26, new CompanyGroup("Groupe Fictif"), "Fictif Aéro", "Stagiaire ingénieur logiciel",
				ApplicationStatus.TO_SEND);
	}

	private void savedEntitiesAreReturnedAsIs() {
		when(groupRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
		when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
	}

	private static JobApplicationRequest request(String groupName, ApplicationStatus status) {
		return request(groupName, status, LocalDate.of(2026, 10, 4), null);
	}

	private static JobApplicationRequest request(String groupName, ApplicationStatus status, LocalDate sentOn,
			LocalDate deadlineDate) {
		return new JobApplicationRequest(groupName, "Fictif Aéro", "Stagiaire ingénieur logiciel", status, sentOn,
				null, deadlineDate, null, null, null, null);
	}

}

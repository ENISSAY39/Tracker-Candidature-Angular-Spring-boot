package io.github.enissay39.tracker.joblead;

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
import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import io.github.enissay39.tracker.jobapplication.JobApplicationService;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import io.github.enissay39.tracker.joblead.dto.DiscardLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;
import io.github.enissay39.tracker.joblead.dto.PromoteLeadRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobLeadServiceTest {

	@Mock
	private JobLeadRepository repository;

	@Mock
	private JobApplicationService applicationService;

	@Captor
	private ArgumentCaptor<JobLead> saved;

	private JobLeadService service;

	@BeforeEach
	void createService() {
		service = new JobLeadService(repository, applicationService);
	}

	@Test
	void importsALeadToEvaluateWithCleanedTexts() {
		service.importLead(new JobLeadRequest(" Fictif Aéro ", "Stagiaire logiciel ", "  ", " Annonce fictive "), null);

		verify(repository).save(saved.capture());
		JobLead lead = saved.getValue();
		assertThat(lead.getState()).isEqualTo(LeadState.TO_EVALUATE);
		assertThat(lead.getCompany()).isEqualTo("Fictif Aéro");
		assertThat(lead.getJobTitle()).isEqualTo("Stagiaire logiciel");
		assertThat(lead.getPlannedCv()).isNull();
		assertThat(lead.getRemark()).isEqualTo("Annonce fictive");
		assertThat(lead.getDiscardReason()).isNull();
	}

	@Test
	void importsADiscardedLeadWithItsReasonKeepingPlannedCvAndRemark() {
		service.importLead(new JobLeadRequest("Fictif Aéro", "Stagiaire logiciel", "CV_Test.pdf", "Remarque"),
				" Trop loin de Ville-Test ");

		verify(repository).save(saved.capture());
		JobLead lead = saved.getValue();
		assertThat(lead.getState()).isEqualTo(LeadState.DISCARDED);
		assertThat(lead.getDiscardReason()).isEqualTo("Trop loin de Ville-Test");
		assertThat(lead.getPlannedCv()).isEqualTo("CV_Test.pdf");
		assertThat(lead.getRemark()).isEqualTo("Remarque");
	}

	@Test
	void listsEveryLeadOrAllLeadsInAState() {
		JobLead toEvaluate = new JobLead("Fictif Aéro", "Stagiaire logiciel");
		JobLead discarded = discarded(new JobLead("Fictif Spatial", "Stagiaire data"), "Trop loin");
		when(repository.findAllByOrderByCreatedAtAscIdAsc()).thenReturn(List.of(toEvaluate, discarded));
		when(repository.findByStateOrderByCreatedAtAscIdAsc(LeadState.DISCARDED)).thenReturn(List.of(discarded));

		assertThat(service.findAll(null)).extracting(JobLeadResponse::company)
			.containsExactly("Fictif Aéro", "Fictif Spatial");
		assertThat(service.findAll(LeadState.DISCARDED)).singleElement().satisfies(lead -> {
			assertThat(lead.state()).isEqualTo(LeadState.DISCARDED);
			assertThat(lead.discardReason()).isEqualTo("Trop loin");
		});
	}

	@Test
	void createsALeadToEvaluateWithCleanedTexts() {
		when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		JobLeadResponse created = service.create(
				new JobLeadRequest(" Fictif Aéro ", " Stagiaire logiciel ", " CV_Test.pdf ", "   "));

		assertThat(created.state()).isEqualTo(LeadState.TO_EVALUATE);
		assertThat(created.company()).isEqualTo("Fictif Aéro");
		assertThat(created.jobTitle()).isEqualTo("Stagiaire logiciel");
		assertThat(created.plannedCv()).isEqualTo("CV_Test.pdf");
		assertThat(created.remark()).isNull();
		assertThat(created.discardReason()).isNull();
	}

	@Test
	void updateChangesTheTextsButNeitherTheStateNorTheReason() {
		JobLead lead = discarded(new JobLead("Fictif Aéro", "Stagiaire logiciel"), "Trop loin");
		lead.setRemark("Ancienne remarque");
		when(repository.findById(7L)).thenReturn(Optional.of(lead));

		JobLeadResponse updated = service.update(7L,
				new JobLeadRequest("Fictif Spatial ", "Stagiaire data", " ", " Nouvelle remarque "));

		verify(repository).saveAndFlush(lead);
		assertThat(updated.company()).isEqualTo("Fictif Spatial");
		assertThat(updated.jobTitle()).isEqualTo("Stagiaire data");
		assertThat(updated.plannedCv()).isNull();
		assertThat(updated.remark()).isEqualTo("Nouvelle remarque");
		assertThat(updated.state()).isEqualTo(LeadState.DISCARDED);
		assertThat(updated.discardReason()).isEqualTo("Trop loin");
	}

	@Test
	void deleteRemovesTheLead() {
		JobLead lead = new JobLead("Fictif Aéro", "Stagiaire logiciel");
		when(repository.findById(7L)).thenReturn(Optional.of(lead));

		service.delete(7L);

		verify(repository).delete(lead);
	}

	@Test
	void anUnknownLeadIsNotFound() {
		when(repository.findById(99L)).thenReturn(Optional.empty());
		JobLeadRequest request = new JobLeadRequest("Fictif Aéro", "Stagiaire logiciel", null, null);

		assertThatThrownBy(() -> service.update(99L, request)).isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Piste 99 introuvable.");
		assertThatThrownBy(() -> service.delete(99L)).isInstanceOf(ResourceNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void promoteCreatesAnApplicationToSendFromTheLeadThenDeletesTheLead() {
		JobLead lead = new JobLead("Fictif Aéro", "Stagiaire logiciel");
		lead.setPlannedCv("CV_Test.pdf");
		lead.setRemark("Annonce fictive\nÀ relire");
		when(repository.findById(7L)).thenReturn(Optional.of(lead));
		JobApplicationResponse created = new JobApplicationResponse(30L, 41, 3L, "Groupe Fictif", "Fictif Aéro",
				"Stagiaire logiciel", ApplicationStatus.TO_SEND, null, null, null, "Annonce fictive\nÀ relire", null,
				null, "CV_Test.pdf", null, null);
		when(applicationService.create(any())).thenReturn(created);

		JobApplicationResponse response = service.promote(7L, new PromoteLeadRequest("Groupe Fictif"));

		assertThat(response).isEqualTo(created);
		verify(applicationService).create(new JobApplicationRequest("Groupe Fictif", "Fictif Aéro",
				"Stagiaire logiciel", ApplicationStatus.TO_SEND, null, null, null, "Annonce fictive\nÀ relire", null,
				null, "CV_Test.pdf"));
		verify(repository).delete(lead);
	}

	@Test
	void promotingADiscardedLeadIsAConflict() {
		when(repository.findById(7L))
			.thenReturn(Optional.of(discarded(new JobLead("Fictif Aéro", "Stagiaire logiciel"), "Trop loin")));

		assertThatThrownBy(() -> service.promote(7L, new PromoteLeadRequest("Groupe Fictif")))
			.isInstanceOf(ConflictException.class)
			.hasMessage("La piste 7 est écartée : réévaluez-la avant de la promouvoir.");
		verify(applicationService, never()).create(any());
		verify(repository, never()).delete(any());
	}

	@Test
	void discardKeepsPlannedCvAndRemarkAndStoresTheCleanedReason() {
		JobLead lead = new JobLead("Fictif Aéro", "Stagiaire logiciel");
		lead.setPlannedCv("CV_Test.pdf");
		lead.setRemark("Annonce fictive");
		when(repository.findById(7L)).thenReturn(Optional.of(lead));

		JobLeadResponse discarded = service.discard(7L, new DiscardLeadRequest(" Trop loin de Ville-Test "));

		verify(repository).saveAndFlush(lead);
		assertThat(discarded.state()).isEqualTo(LeadState.DISCARDED);
		assertThat(discarded.discardReason()).isEqualTo("Trop loin de Ville-Test");
		assertThat(discarded.plannedCv()).isEqualTo("CV_Test.pdf");
		assertThat(discarded.remark()).isEqualTo("Annonce fictive");
	}

	@Test
	void discardingAnAlreadyDiscardedLeadIsAConflict() {
		when(repository.findById(7L))
			.thenReturn(Optional.of(discarded(new JobLead("Fictif Aéro", "Stagiaire logiciel"), "Trop loin")));

		assertThatThrownBy(() -> service.discard(7L, new DiscardLeadRequest("Autre motif")))
			.isInstanceOf(ConflictException.class)
			.hasMessage("La piste 7 est déjà écartée.");
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void restoreBringsTheLeadBackToEvaluateAndClearsTheReason() {
		JobLead lead = discarded(new JobLead("Fictif Aéro", "Stagiaire logiciel"), "Trop loin");
		lead.setRemark("Annonce fictive");
		when(repository.findById(7L)).thenReturn(Optional.of(lead));

		JobLeadResponse restored = service.restore(7L);

		verify(repository).saveAndFlush(lead);
		assertThat(restored.state()).isEqualTo(LeadState.TO_EVALUATE);
		assertThat(restored.discardReason()).isNull();
		assertThat(restored.remark()).isEqualTo("Annonce fictive");
	}

	@Test
	void restoringALeadToEvaluateIsAConflict() {
		when(repository.findById(7L)).thenReturn(Optional.of(new JobLead("Fictif Aéro", "Stagiaire logiciel")));

		assertThatThrownBy(() -> service.restore(7L)).isInstanceOf(ConflictException.class)
			.hasMessage("La piste 7 est déjà à évaluer.");
		verify(repository, never()).saveAndFlush(any());
	}

	private static JobLead discarded(JobLead lead, String reason) {
		lead.setState(LeadState.DISCARDED);
		lead.setDiscardReason(reason);
		return lead;
	}

}

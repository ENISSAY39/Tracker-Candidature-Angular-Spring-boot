package io.github.enissay39.tracker.joblead;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
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

	@Captor
	private ArgumentCaptor<JobLead> saved;

	private JobLeadService service;

	@BeforeEach
	void createService() {
		service = new JobLeadService(repository);
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

}

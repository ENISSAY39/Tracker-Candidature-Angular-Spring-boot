package io.github.enissay39.tracker.jobapplication;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

class ApplicationStatusTest {

	@Test
	void categoriesFollowTheDefaultSortOrderWithTheirCounterLabel() {
		assertThat(Arrays.stream(StatusCategory.values()).map(c -> c.name() + "=" + c.getLabel()))
			.containsExactly("OFFER=Offre", "INTERVIEW=Entretien", "OPENED=Dossier ouvert par le recruteur",
					"PENDING=En attente", "TO_SEND=À envoyer", "REJECTED=Refus", "WITHDRAWN=Abandonnée");
	}

	@Test
	void statusesFollowTheWorkbookOrderWithTheirLabelAndCategory() {
		assertThat(Arrays.stream(ApplicationStatus.values())
			.map(s -> s.name() + "=" + s.getLabel() + "/" + s.getCategory()))
			.containsExactly("OFFER=Offre/OFFER", "INTERVIEW=Entretien/INTERVIEW", "UNDER_REVIEW=En examen/OPENED",
					"IN_EVALUATION=En cours d'évaluation/OPENED", "PRE_SELECTION=Pré-sélection/OPENED",
					"SELECTION=Sélection/OPENED", "PENDING=En attente/PENDING", "TO_SEND=À envoyer/TO_SEND",
					"REJECTED=Refus/REJECTED", "WITHDRAWN=Abandonnée/WITHDRAWN");
	}

}

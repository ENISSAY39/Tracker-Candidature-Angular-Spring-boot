package io.github.enissay39.tracker.jobapplication;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(StatusController.class)
class StatusControllerTest {

	@Autowired
	private MockMvcTester mvc;

	@Test
	void listsTheTenStatusesInWorkbookOrderWithTheirCategory() {
		assertThat(mvc.get().uri("/api/statuses")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				[
				  {"code": "OFFER", "label": "Offre", "order": 1,
				   "category": {"code": "OFFER", "label": "Offre", "order": 1}},
				  {"code": "INTERVIEW", "label": "Entretien", "order": 2,
				   "category": {"code": "INTERVIEW", "label": "Entretien", "order": 2}},
				  {"code": "UNDER_REVIEW", "label": "En examen", "order": 3,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "IN_EVALUATION", "label": "En cours d'évaluation", "order": 4,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "PRE_SELECTION", "label": "Pré-sélection", "order": 5,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "SELECTION", "label": "Sélection", "order": 6,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "PENDING", "label": "En attente", "order": 7,
				   "category": {"code": "PENDING", "label": "En attente", "order": 4}},
				  {"code": "TO_SEND", "label": "À envoyer", "order": 8,
				   "category": {"code": "TO_SEND", "label": "À envoyer", "order": 5}},
				  {"code": "REJECTED", "label": "Refus", "order": 9,
				   "category": {"code": "REJECTED", "label": "Refus", "order": 6}},
				  {"code": "WITHDRAWN", "label": "Abandonnée", "order": 10,
				   "category": {"code": "WITHDRAWN", "label": "Abandonnée", "order": 7}}
				]
				""");
	}

}

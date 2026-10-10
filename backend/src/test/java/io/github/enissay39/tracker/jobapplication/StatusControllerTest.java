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
	void listsTheTenStatusesInWorkbookOrderWithTheirCategoryAndRules() {
		assertThat(mvc.get().uri("/api/statuses")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
				[
				  {"code": "OFFER", "label": "Offre", "order": 1, "requiresSentOn": true, "closed": false,
				   "category": {"code": "OFFER", "label": "Offre", "order": 1}},
				  {"code": "INTERVIEW", "label": "Entretien", "order": 2, "requiresSentOn": true, "closed": false,
				   "category": {"code": "INTERVIEW", "label": "Entretien", "order": 2}},
				  {"code": "UNDER_REVIEW", "label": "En examen", "order": 3, "requiresSentOn": true, "closed": false,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "IN_EVALUATION", "label": "En cours d'évaluation", "order": 4, "requiresSentOn": true, "closed": false,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "PRE_SELECTION", "label": "Pré-sélection", "order": 5, "requiresSentOn": true, "closed": false,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "SELECTION", "label": "Sélection", "order": 6, "requiresSentOn": true, "closed": false,
				   "category": {"code": "OPENED", "label": "Dossier ouvert par le recruteur", "order": 3}},
				  {"code": "PENDING", "label": "En attente", "order": 7, "requiresSentOn": true, "closed": false,
				   "category": {"code": "PENDING", "label": "En attente", "order": 4}},
				  {"code": "TO_SEND", "label": "À envoyer", "order": 8, "requiresSentOn": false, "closed": false,
				   "category": {"code": "TO_SEND", "label": "À envoyer", "order": 5}},
				  {"code": "REJECTED", "label": "Refus", "order": 9, "requiresSentOn": true, "closed": true,
				   "category": {"code": "REJECTED", "label": "Refus", "order": 6}},
				  {"code": "WITHDRAWN", "label": "Abandonnée", "order": 10, "requiresSentOn": false, "closed": true,
				   "category": {"code": "WITHDRAWN", "label": "Abandonnée", "order": 7}}
				]
				""");
	}

}

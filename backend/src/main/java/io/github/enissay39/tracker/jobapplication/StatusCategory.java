package io.github.enissay39.tracker.jobapplication;

/**
 * Catégorie d'un statut : un compteur par catégorie. L'ordre de déclaration est l'ordre de tri par défaut.
 */
public enum StatusCategory {

	OFFER("Offre"),
	INTERVIEW("Entretien"),
	OPENED("Dossier ouvert par le recruteur"),
	PENDING("En attente"),
	TO_SEND("À envoyer"),
	REJECTED("Refus"),
	WITHDRAWN("Abandonnée");

	private final String label;

	StatusCategory(String label) {
		this.label = label;
	}

	public String getLabel() {
		return label;
	}

}

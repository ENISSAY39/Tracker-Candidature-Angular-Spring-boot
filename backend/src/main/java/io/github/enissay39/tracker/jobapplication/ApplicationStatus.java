package io.github.enissay39.tracker.jobapplication;

/**
 * Statut d'une candidature. L'ordre de déclaration est celui du classeur ; toute valeur ajoutée ici doit l'être
 * aussi dans la contrainte CHECK de la colonne {@code job_application.status}.
 */
public enum ApplicationStatus {

	OFFER("Offre", StatusCategory.OFFER),
	INTERVIEW("Entretien", StatusCategory.INTERVIEW),
	UNDER_REVIEW("En examen", StatusCategory.OPENED),
	IN_EVALUATION("En cours d'évaluation", StatusCategory.OPENED),
	PRE_SELECTION("Pré-sélection", StatusCategory.OPENED),
	SELECTION("Sélection", StatusCategory.OPENED),
	PENDING("En attente", StatusCategory.PENDING),
	TO_SEND("À envoyer", StatusCategory.TO_SEND),
	REJECTED("Refus", StatusCategory.REJECTED),
	WITHDRAWN("Abandonnée", StatusCategory.WITHDRAWN);

	private final String label;

	private final StatusCategory category;

	ApplicationStatus(String label, StatusCategory category) {
		this.label = label;
		this.category = category;
	}

	public String getLabel() {
		return label;
	}

	public StatusCategory getCategory() {
		return category;
	}

	/**
	 * Une candidature jamais partie (à envoyer, ou abandonnée avant l'envoi) peut ne pas avoir de date d'envoi.
	 */
	public boolean requiresSentOn() {
		return this != TO_SEND && this != WITHDRAWN;
	}

	/**
	 * Statut clos : plus de prochaine étape, donc plus de date d'échéance.
	 */
	public boolean isClosed() {
		return this == REJECTED || this == WITHDRAWN;
	}

}

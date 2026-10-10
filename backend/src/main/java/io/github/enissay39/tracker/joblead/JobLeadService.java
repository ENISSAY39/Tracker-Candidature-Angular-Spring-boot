package io.github.enissay39.tracker.joblead;

import io.github.enissay39.tracker.common.Texts;
import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class JobLeadService {

	private final JobLeadRepository repository;

	public JobLeadService(JobLeadRepository repository) {
		this.repository = repository;
	}

	/**
	 * Supprime toutes les pistes. Réservé à l'import en mode remplacement.
	 */
	@Transactional
	public void deleteAll() {
		repository.deleteAllInBatch();
	}

	/**
	 * Piste lue dans le classeur : à évaluer, ou écartée si un motif est donné. Textes nettoyés, vides à
	 * {@code null}.
	 */
	@Transactional
	public void importLead(JobLeadRequest request, String discardReason) {
		JobLead lead = new JobLead(request.company().trim(), request.jobTitle().trim());
		lead.setPlannedCv(Texts.trimToNull(request.plannedCv()));
		lead.setRemark(Texts.trimToNull(request.remark()));
		String reason = Texts.trimToNull(discardReason);
		if (reason != null) {
			lead.setState(LeadState.DISCARDED);
			lead.setDiscardReason(reason);
		}
		repository.save(lead);
	}

}

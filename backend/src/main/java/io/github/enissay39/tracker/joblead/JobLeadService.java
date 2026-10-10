package io.github.enissay39.tracker.joblead;

import java.util.List;

import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.common.Texts;
import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;
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
	 * Pistes par date de création : toutes, ou celles d'un état si {@code state} est donné.
	 */
	public List<JobLeadResponse> findAll(LeadState state) {
		List<JobLead> leads = (state == null) ? repository.findAllByOrderByCreatedAtAscIdAsc()
				: repository.findByStateOrderByCreatedAtAscIdAsc(state);
		return leads.stream().map(JobLeadMapper::toResponse).toList();
	}

	/**
	 * Une piste naît à évaluer.
	 */
	@Transactional
	public JobLeadResponse create(JobLeadRequest request) {
		JobLead lead = new JobLead(request.company().trim(), request.jobTitle().trim());
		copyDetails(request, lead);
		return JobLeadMapper.toResponse(repository.save(lead));
	}

	/**
	 * Modifie les textes d'une piste, quel que soit son état ; l'état et le motif ne changent pas.
	 */
	@Transactional
	public JobLeadResponse update(Long id, JobLeadRequest request) {
		JobLead lead = findExisting(id);
		lead.setCompany(request.company().trim());
		lead.setJobTitle(request.jobTitle().trim());
		copyDetails(request, lead);
		// Écriture immédiate : la réponse porte la date de modification posée par l'entité
		repository.saveAndFlush(lead);
		return JobLeadMapper.toResponse(lead);
	}

	@Transactional
	public void delete(Long id) {
		repository.delete(findExisting(id));
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
		copyDetails(request, lead);
		String reason = Texts.trimToNull(discardReason);
		if (reason != null) {
			lead.setState(LeadState.DISCARDED);
			lead.setDiscardReason(reason);
		}
		repository.save(lead);
	}

	private JobLead findExisting(Long id) {
		return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Piste " + id + " introuvable."));
	}

	// Textes facultatifs nettoyés, vides à null
	private static void copyDetails(JobLeadRequest request, JobLead lead) {
		lead.setPlannedCv(Texts.trimToNull(request.plannedCv()));
		lead.setRemark(Texts.trimToNull(request.remark()));
	}

}

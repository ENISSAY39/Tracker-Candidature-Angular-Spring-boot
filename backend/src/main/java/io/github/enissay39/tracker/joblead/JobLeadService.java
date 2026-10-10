package io.github.enissay39.tracker.joblead;

import java.util.List;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.common.Texts;
import io.github.enissay39.tracker.jobapplication.JobApplicationService;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import io.github.enissay39.tracker.joblead.dto.DiscardLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadRequest;
import io.github.enissay39.tracker.joblead.dto.JobLeadResponse;
import io.github.enissay39.tracker.joblead.dto.PromoteLeadRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class JobLeadService {

	private final JobLeadRepository repository;

	private final JobApplicationService applicationService;

	public JobLeadService(JobLeadRepository repository, JobApplicationService applicationService) {
		this.repository = repository;
		this.applicationService = applicationService;
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
	 * Crée une candidature « À envoyer » à partir d'une piste à évaluer, puis supprime la piste, dans la même
	 * transaction : si la création échoue, la piste reste. Numéro et groupe suivent les règles des candidatures.
	 */
	@Transactional
	public JobApplicationResponse promote(Long id, PromoteLeadRequest request) {
		JobLead lead = findExisting(id);
		if (lead.getState() == LeadState.DISCARDED) {
			throw new ConflictException("La piste " + id + " est écartée : réévaluez-la avant de la promouvoir.");
		}
		JobApplicationResponse application = applicationService
			.create(JobLeadMapper.toApplicationRequest(lead, request.groupName()));
		repository.delete(lead);
		return application;
	}

	/**
	 * Écarte une piste à évaluer avec son motif ; CV prévu et remarque sont conservés.
	 */
	@Transactional
	public JobLeadResponse discard(Long id, DiscardLeadRequest request) {
		JobLead lead = findExisting(id);
		if (lead.getState() == LeadState.DISCARDED) {
			throw new ConflictException("La piste " + id + " est déjà écartée.");
		}
		lead.discard(request.reason().trim());
		repository.saveAndFlush(lead);
		return JobLeadMapper.toResponse(lead);
	}

	/**
	 * Remet une piste écartée à évaluer et efface son motif.
	 */
	@Transactional
	public JobLeadResponse restore(Long id) {
		JobLead lead = findExisting(id);
		if (lead.getState() == LeadState.TO_EVALUATE) {
			throw new ConflictException("La piste " + id + " est déjà à évaluer.");
		}
		lead.restore();
		repository.saveAndFlush(lead);
		return JobLeadMapper.toResponse(lead);
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
			lead.discard(reason);
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

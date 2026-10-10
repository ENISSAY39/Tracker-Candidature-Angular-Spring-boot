package io.github.enissay39.tracker.jobapplication;

import java.time.LocalDate;
import java.util.List;

import io.github.enissay39.tracker.common.FieldRuleViolationException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.common.Texts;
import io.github.enissay39.tracker.companygroup.CompanyGroup;
import io.github.enissay39.tracker.companygroup.CompanyGroupService;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationResponse;
import io.github.enissay39.tracker.jobapplication.dto.StatusChangeRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class JobApplicationService {

	private final JobApplicationRepository repository;

	private final CompanyGroupService groupService;

	public JobApplicationService(JobApplicationRepository repository, CompanyGroupService groupService) {
		this.repository = repository;
		this.groupService = groupService;
	}

	public List<JobApplicationResponse> findAll() {
		return repository.findAllWithCompanyGroup().stream().map(JobApplicationMapper::toResponse).toList();
	}

	public JobApplicationResponse findById(Long id) {
		return JobApplicationMapper.toResponse(findExisting(id));
	}

	@Transactional
	public JobApplicationResponse create(JobApplicationRequest request) {
		requireSentOnIfNeeded(request.status(), request.sentOn());
		return JobApplicationMapper.toResponse(repository.save(newApplication(repository.nextNumber(), request)));
	}

	public boolean hasApplications() {
		return repository.count() > 0;
	}

	/**
	 * Crée une candidature avec le numéro imposé par le classeur importé, selon les mêmes règles qu'une création.
	 * Une fois l'import terminé, {@link #alignNumberSequence()} recale la séquence.
	 */
	@Transactional
	public void importApplication(int number, JobApplicationRequest request) {
		requireSentOnIfNeeded(request.status(), request.sentOn());
		repository.save(newApplication(number, request));
	}

	/**
	 * Supprime toutes les candidatures. Réservé à l'import en mode remplacement.
	 */
	@Transactional
	public void deleteAll() {
		repository.deleteAllInBatch();
	}

	/**
	 * Le prochain numéro attribué sera le plus grand numéro en base + 1.
	 */
	@Transactional
	public void alignNumberSequence() {
		repository.alignNumberSequence();
	}

	/**
	 * Remplace tous les champs saisissables ; le numéro ne change jamais.
	 */
	@Transactional
	public JobApplicationResponse update(Long id, JobApplicationRequest request) {
		JobApplication application = findExisting(id);
		requireSentOnIfNeeded(request.status(), request.sentOn());
		application.setCompanyGroup(groupService.findOrCreate(request.groupName()));
		application.setCompany(request.company().trim());
		application.setJobTitle(request.jobTitle().trim());
		application.setStatus(request.status());
		copyDetails(request, application);
		// Écriture immédiate : la réponse porte la date de modification posée par l'entité
		repository.saveAndFlush(application);
		return JobApplicationMapper.toResponse(application);
	}

	/**
	 * Change le statut. Une date absente de la requête garde sa valeur actuelle ; aucune date n'est jamais déduite
	 * de l'horloge du serveur.
	 */
	@Transactional
	public JobApplicationResponse changeStatus(Long id, StatusChangeRequest request) {
		JobApplication application = findExisting(id);
		ApplicationStatus status = request.status();
		LocalDate sentOn = (request.sentOn() != null) ? request.sentOn() : application.getSentOn();
		requireSentOnIfNeeded(status, sentOn);
		LocalDate deadlineDate = (request.deadlineDate() != null) ? request.deadlineDate()
				: application.getDeadlineDate();
		application.setStatus(status);
		application.setSentOn(sentOn);
		// Statut clos : plus d'échéance ; une réouverture ne restaure rien
		application.setDeadlineDate(status.isClosed() ? null : deadlineDate);
		// Écriture immédiate, comme pour update : la réponse porte la date de modification
		repository.saveAndFlush(application);
		return JobApplicationMapper.toResponse(application);
	}

	/**
	 * Supprime la candidature ; son numéro n'est jamais réattribué (la séquence ne recule pas).
	 */
	@Transactional
	public void delete(Long id) {
		repository.delete(findExisting(id));
	}

	private JobApplication newApplication(int number, JobApplicationRequest request) {
		CompanyGroup group = groupService.findOrCreate(request.groupName());
		JobApplication application = new JobApplication(number, group, request.company().trim(),
				request.jobTitle().trim(), request.status());
		copyDetails(request, application);
		return application;
	}

	private JobApplication findExisting(Long id) {
		return repository.findById(id)
			.orElseThrow(() -> new ResourceNotFoundException("Candidature " + id + " introuvable."));
	}

	// Champs facultatifs, une fois le statut posé
	private static void copyDetails(JobApplicationRequest request, JobApplication application) {
		application.setSentOn(request.sentOn());
		// Statut clos : plus de prochaine étape, l'échéance fournie est ignorée
		application.setDeadlineDate(request.status().isClosed() ? null : request.deadlineDate());
		application.setDeadlineLabel(Texts.trimToNull(request.deadlineLabel()));
		application.setNotes(Texts.trimToNull(request.notes()));
		application.setStartPeriod(Texts.trimToNull(request.startPeriod()));
		application.setChannel(Texts.trimToNull(request.channel()));
		application.setCvSent(Texts.trimToNull(request.cvSent()));
	}

	private static void requireSentOnIfNeeded(ApplicationStatus status, LocalDate sentOn) {
		if (status.requiresSentOn() && sentOn == null) {
			throw new FieldRuleViolationException("sentOn", "La date d'envoi est obligatoire pour ce statut.");
		}
	}

}

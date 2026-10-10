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
		CompanyGroup group = groupService.findOrCreate(request.groupName());
		JobApplication application = new JobApplication(repository.nextNumber(), group, request.company().trim(),
				request.jobTitle().trim(), request.status());
		copyDetails(request, application);
		return JobApplicationMapper.toResponse(repository.save(application));
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
	 * Supprime la candidature ; son numéro n'est jamais réattribué (la séquence ne recule pas).
	 */
	@Transactional
	public void delete(Long id) {
		repository.delete(findExisting(id));
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

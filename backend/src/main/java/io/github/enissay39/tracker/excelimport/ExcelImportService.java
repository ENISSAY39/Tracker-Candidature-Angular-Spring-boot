package io.github.enissay39.tracker.excelimport;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.companygroup.CompanyGroupService;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import io.github.enissay39.tracker.jobapplication.JobApplicationService;
import io.github.enissay39.tracker.joblead.JobLeadService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Import du classeur Excel, tout ou rien : le classeur est lu et validé en entier avant toute écriture, puis chargé
 * dans une seule transaction.
 */
@Service
public class ExcelImportService {

	private final JobApplicationService applicationService;

	private final CompanyGroupService groupService;

	private final JobLeadService leadService;

	public ExcelImportService(JobApplicationService applicationService, CompanyGroupService groupService,
			JobLeadService leadService) {
		this.applicationService = applicationService;
		this.groupService = groupService;
		this.leadService = leadService;
	}

	@Transactional
	public ImportResultResponse importWorkbook(InputStream input, ImportMode mode) {
		if (mode == ImportMode.INITIAL && applicationService.hasApplications()) {
			throw new ConflictException("La base contient déjà des candidatures : l'import est refusé.");
		}
		ParsedWorkbook workbook = read(input);
		if (mode == ImportMode.REPLACE) {
			// Après la validation du nouveau classeur : un classeur rejeté laisse les données intactes
			applicationService.deleteAll();
			leadService.deleteAll();
			groupService.deleteAll();
		}
		long groupsBefore = groupService.count();
		for (ImportedApplication application : workbook.applications()) {
			applicationService.importApplication(application.number(), application.request());
		}
		applicationService.alignNumberSequence();
		for (ImportedLead lead : workbook.leads()) {
			leadService.importLead(lead.request(), lead.discardReason());
		}
		return new ImportResultResponse((int) (groupService.count() - groupsBefore), workbook.applications().size(),
				workbook.leads().size());
	}

	// Tout le classeur est lu et validé avant la première écriture
	private static ParsedWorkbook read(InputStream input) {
		try (WorkbookReader reader = WorkbookReader.open(input)) {
			List<ImportedApplication> applications = reader.readApplications();
			List<ImportedLead> leads = new ArrayList<>(reader.readLeads(WorkbookReader.TO_EVALUATE_SHEET, false));
			leads.addAll(reader.readLeads(WorkbookReader.DISCARDED_SHEET, true));
			return new ParsedWorkbook(applications, leads);
		}
	}

	/** Contenu du classeur, entièrement lu et validé. */
	private record ParsedWorkbook(List<ImportedApplication> applications, List<ImportedLead> leads) {
	}

}

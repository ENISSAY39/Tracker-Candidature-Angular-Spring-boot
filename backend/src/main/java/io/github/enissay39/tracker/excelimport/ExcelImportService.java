package io.github.enissay39.tracker.excelimport;

import java.io.InputStream;
import java.util.List;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.companygroup.CompanyGroupService;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import io.github.enissay39.tracker.jobapplication.JobApplicationService;
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

	public ExcelImportService(JobApplicationService applicationService, CompanyGroupService groupService) {
		this.applicationService = applicationService;
		this.groupService = groupService;
	}

	@Transactional
	public ImportResultResponse importWorkbook(InputStream input) {
		if (applicationService.hasApplications()) {
			throw new ConflictException("La base contient déjà des candidatures : l'import est refusé.");
		}
		List<ImportedApplication> applications = read(input);
		long groupsBefore = groupService.count();
		for (ImportedApplication application : applications) {
			applicationService.importApplication(application.number(), application.request());
		}
		applicationService.alignNumberSequence();
		return new ImportResultResponse((int) (groupService.count() - groupsBefore), applications.size(), 0);
	}

	private static List<ImportedApplication> read(InputStream input) {
		try (WorkbookReader reader = WorkbookReader.open(input)) {
			return reader.readApplications();
		}
	}

}

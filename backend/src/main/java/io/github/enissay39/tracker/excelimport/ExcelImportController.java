package io.github.enissay39.tracker.excelimport;

import java.io.IOException;
import java.io.InputStream;

import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.excelimport.dto.ImportResultResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/import")
public class ExcelImportController {

	private final ExcelImportService service;

	public ExcelImportController(ExcelImportService service) {
		this.service = service;
	}

	@PostMapping(path = "/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ImportResultResponse importExcel(@RequestParam(name = "file", required = false) MultipartFile file)
			throws IOException {
		if (file == null || file.isEmpty()) {
			throw new InvalidRequestException("Aucun fichier n'a été envoyé.");
		}
		try (InputStream input = file.getInputStream()) {
			return service.importWorkbook(input);
		}
	}

}

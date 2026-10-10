package io.github.enissay39.tracker.excelimport;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import io.github.enissay39.tracker.common.InvalidRequestException;
import io.github.enissay39.tracker.common.Texts;
import io.github.enissay39.tracker.jobapplication.ApplicationStatus;
import io.github.enissay39.tracker.jobapplication.dto.JobApplicationRequest;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

/**
 * Lecture du classeur : les colonnes sont repérées par leur intitulé, les dates ne viennent que de cellules de type
 * date. Toute anomalie rejette l'import en citant la feuille et la ligne telle qu'Excel l'affiche.
 */
final class WorkbookReader implements AutoCloseable {

	static final String APPLICATIONS_SHEET = "Toutes les candidatures";

	private static final Map<String, ApplicationStatus> STATUS_BY_LABEL = Arrays.stream(ApplicationStatus.values())
		.collect(Collectors.toMap(ApplicationStatus::getLabel, Function.identity()));

	private final Workbook workbook;

	// Texte tel qu'Excel l'affiche en français ; une formule donne sa dernière valeur calculée, jamais réévaluée
	private final DataFormatter formatter = new DataFormatter(Locale.FRANCE);

	private WorkbookReader(Workbook workbook) {
		this.workbook = workbook;
		formatter.setUseCachedValuesForFormulaCells(true);
	}

	static WorkbookReader open(InputStream input) {
		try {
			return new WorkbookReader(WorkbookFactory.create(input));
		}
		catch (Exception ex) {
			throw new InvalidRequestException("Le fichier n'est pas un classeur Excel lisible (.xlsx).");
		}
	}

	/**
	 * Feuille « Toutes les candidatures » : en-têtes sur la première ligne dont la première cellule vaut {@code #},
	 * lecture jusqu'à la première ligne sans numéro.
	 */
	List<ImportedApplication> readApplications() {
		Sheet sheet = requireSheet(APPLICATIONS_SHEET);
		Columns columns = headerRow(sheet, "#");
		columns.require("#", "Groupe", "Entreprise", "Poste", "Statut");
		List<ImportedApplication> applications = new ArrayList<>();
		for (int index = columns.headerIndex() + 1; index <= sheet.getLastRowNum(); index++) {
			Row row = sheet.getRow(index);
			Cell numberCell = columns.cell(row, "#");
			if (isBlank(numberCell)) {
				break;
			}
			applications.add(new ImportedApplication(number(sheet, index, numberCell),
					new JobApplicationRequest(text(columns.cell(row, "Groupe")),
							text(columns.cell(row, "Entreprise")), text(columns.cell(row, "Poste")),
							status(sheet, index, columns.cell(row, "Statut")),
							date(sheet, index, columns.cell(row, "Envoyée le")), text(columns.cell(row, "Échéance")),
							date(sheet, index, columns.cell(row, "Date échéance")),
							text(columns.cell(row, "Prochaine action")), text(columns.cell(row, "Début")),
							text(columns.cell(row, "Canal")), text(columns.cell(row, "CV envoyé")))));
		}
		return applications;
	}

	@Override
	public void close() {
		try {
			workbook.close();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	private Sheet requireSheet(String name) {
		Sheet sheet = workbook.getSheet(name);
		if (sheet == null) {
			throw new InvalidRequestException("La feuille « " + name + " » est introuvable dans le classeur.");
		}
		return sheet;
	}

	private Columns headerRow(Sheet sheet, String firstHeading) {
		for (Row row : sheet) {
			if (firstHeading.equals(text(row.getCell(0)))) {
				Map<String, Integer> indexes = new HashMap<>();
				for (Cell cell : row) {
					String heading = text(cell);
					if (heading != null) {
						indexes.putIfAbsent(heading, cell.getColumnIndex());
					}
				}
				return new Columns(sheet.getSheetName(), row.getRowNum(), indexes);
			}
		}
		throw new InvalidRequestException("Feuille « " + sheet.getSheetName()
				+ " » : ligne d'en-têtes introuvable (première cellule « " + firstHeading + " »).");
	}

	private ApplicationStatus status(Sheet sheet, int index, Cell cell) {
		String label = text(cell);
		ApplicationStatus status = (label == null) ? null : STATUS_BY_LABEL.get(label);
		if (status == null) {
			throw rejected(sheet, index, "statut « " + (label == null ? "" : label) + " » inconnu.");
		}
		return status;
	}

	private LocalDate date(Sheet sheet, int index, Cell cell) {
		if (isBlank(cell)) {
			return null;
		}
		if (cellType(cell) != CellType.NUMERIC || !DateUtil.isCellDateFormatted(cell)) {
			throw rejected(sheet, index, "la cellule " + cell.getAddress() + " n'est pas une date.");
		}
		return cell.getLocalDateTimeCellValue().toLocalDate();
	}

	private int number(Sheet sheet, int index, Cell cell) {
		if (cellType(cell) == CellType.NUMERIC) {
			double value = cell.getNumericCellValue();
			if (value == Math.rint(value) && value >= 1 && value <= Integer.MAX_VALUE) {
				return (int) value;
			}
		}
		throw rejected(sheet, index, "numéro « " + text(cell) + " » invalide.");
	}

	// Texte affiché par Excel, sans espaces de début et de fin ; null si la cellule est vide
	private String text(Cell cell) {
		return (cell == null) ? null : Texts.trimToNull(formatter.formatCellValue(cell));
	}

	private boolean isBlank(Cell cell) {
		return text(cell) == null;
	}

	private CellType cellType(Cell cell) {
		return (cell.getCellType() == CellType.FORMULA) ? cell.getCachedFormulaResultType() : cell.getCellType();
	}

	private static InvalidRequestException rejected(Sheet sheet, int index, String reason) {
		return new InvalidRequestException(
				"Import refusé : feuille « " + sheet.getSheetName() + " », ligne " + (index + 1) + " : " + reason);
	}

	/**
	 * Index des colonnes d'une feuille, par intitulé.
	 */
	private record Columns(String sheetName, int headerIndex, Map<String, Integer> indexes) {

		void require(String... headings) {
			for (String heading : headings) {
				if (!indexes.containsKey(heading)) {
					throw new InvalidRequestException(
							"Feuille « " + sheetName + " » : colonne « " + heading + " » introuvable.");
				}
			}
		}

		Cell cell(Row row, String heading) {
			Integer index = indexes.get(heading);
			return (row == null || index == null) ? null : row.getCell(index);
		}

	}

}

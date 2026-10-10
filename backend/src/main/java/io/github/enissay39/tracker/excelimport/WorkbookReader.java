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
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Lecture du classeur : les colonnes sont repérées par leur intitulé, les dates ne viennent que de cellules de type
 * date. Le classeur est validé en entier avant toute écriture ; toute anomalie rejette l'import en citant la feuille
 * et la ligne telle qu'Excel l'affiche.
 */
final class WorkbookReader implements AutoCloseable {

	static final String APPLICATIONS_SHEET = "Toutes les candidatures";

	private static final String NUMBER = "#";

	private static final String GROUP = "Groupe";

	private static final String COMPANY = "Entreprise";

	private static final String JOB_TITLE = "Poste";

	private static final String STATUS = "Statut";

	private static final String SENT_ON = "Envoyée le";

	private static final String DEADLINE_LABEL = "Échéance";

	private static final String DEADLINE_DATE = "Date échéance";

	private static final String NOTES = "Prochaine action";

	private static final String START_PERIOD = "Début";

	private static final String CHANNEL = "Canal";

	private static final String CV_SENT = "CV envoyé";

	// Longueurs maximales des colonnes varchar du schéma (comme les @Size de JobApplicationRequest)
	private static final int MAX_SHORT_TEXT_LENGTH = 100;

	private static final int MAX_TEXT_LENGTH = 255;

	private static final Map<String, ApplicationStatus> STATUS_BY_LABEL = Arrays.stream(ApplicationStatus.values())
		.collect(Collectors.toMap(ApplicationStatus::getLabel, Function.identity()));

	private final Workbook workbook;

	// Texte tel qu'Excel l'affiche en français ; une formule donne sa dernière valeur calculée, jamais réévaluée
	private final DataFormatter formatter = new DataFormatter(Locale.FRANCE);

	private WorkbookReader(Workbook workbook) {
		this.workbook = workbook;
		formatter.setUseCachedValuesForFormulaCells(true);
	}

	/**
	 * Ouvre un classeur {@code .xlsx} ; tout autre contenu (ancien {@code .xls}, CSV, fichier abîmé) est refusé.
	 */
	static WorkbookReader open(InputStream input) {
		try {
			return new WorkbookReader(new XSSFWorkbook(input));
		}
		catch (IOException | RuntimeException ex) {
			throw new InvalidRequestException("Le fichier n'est pas un classeur Excel lisible (.xlsx).");
		}
	}

	/**
	 * Feuille « Toutes les candidatures » : en-têtes sur la première ligne dont la première cellule vaut {@code #},
	 * lecture jusqu'à la première ligne sans numéro.
	 */
	List<ImportedApplication> readApplications() {
		Sheet sheet = requireSheet(APPLICATIONS_SHEET);
		Columns columns = headerRow(sheet, NUMBER);
		columns.require(NUMBER, GROUP, COMPANY, JOB_TITLE, STATUS);
		List<ImportedApplication> applications = new ArrayList<>();
		Map<Integer, Integer> rowByNumber = new HashMap<>();
		for (int index = columns.headerIndex() + 1; index <= sheet.getLastRowNum(); index++) {
			ApplicationRow row = new ApplicationRow(sheet, index, columns);
			if (row.isBlank(NUMBER)) {
				break;
			}
			int number = row.number();
			Integer previousRow = rowByNumber.putIfAbsent(number, row.excelRow());
			if (previousRow != null) {
				throw row.rejected("numéro " + number + " en double (déjà ligne " + previousRow + ").");
			}
			applications.add(new ImportedApplication(number, row.request()));
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

	// Texte affiché par Excel, sans espaces de début et de fin ; null si la cellule est vide
	private String text(Cell cell) {
		return (cell == null) ? null : Texts.trimToNull(formatter.formatCellValue(cell));
	}

	private static CellType cellType(Cell cell) {
		return (cell.getCellType() == CellType.FORMULA) ? cell.getCachedFormulaResultType() : cell.getCellType();
	}

	/**
	 * Une ligne de candidature : chaque lecture vérifie sa cellule et rejette l'import en citant la ligne.
	 */
	private final class ApplicationRow {

		private final Sheet sheet;

		private final int index;

		private final Row row;

		private final Columns columns;

		ApplicationRow(Sheet sheet, int index, Columns columns) {
			this.sheet = sheet;
			this.index = index;
			this.row = sheet.getRow(index);
			this.columns = columns;
		}

		/** Numéro de la ligne tel qu'Excel l'affiche. */
		int excelRow() {
			return index + 1;
		}

		boolean isBlank(String heading) {
			return text(cell(heading)) == null;
		}

		int number() {
			Cell cell = cell(NUMBER);
			if (cellType(cell) == CellType.NUMERIC) {
				double value = cell.getNumericCellValue();
				if (value == Math.rint(value) && value >= 1 && value <= Integer.MAX_VALUE) {
					return (int) value;
				}
			}
			throw rejected("numéro « " + text(cell) + " » invalide.");
		}

		JobApplicationRequest request() {
			ApplicationStatus status = status();
			LocalDate sentOn = date(SENT_ON);
			// ADR 0001 : la date d'envoi est contrôlée ici, pour citer la ligne fautive
			if (status.requiresSentOn() && sentOn == null) {
				throw rejected("« " + SENT_ON + " » est vide alors que le statut « " + status.getLabel()
						+ " » l'exige.");
			}
			return new JobApplicationRequest(required(GROUP, MAX_SHORT_TEXT_LENGTH),
					required(COMPANY, MAX_TEXT_LENGTH), required(JOB_TITLE, MAX_TEXT_LENGTH), status, sentOn,
					optional(DEADLINE_LABEL, MAX_TEXT_LENGTH), date(DEADLINE_DATE), text(cell(NOTES)),
					optional(START_PERIOD, MAX_SHORT_TEXT_LENGTH), optional(CHANNEL, MAX_TEXT_LENGTH),
					optional(CV_SENT, MAX_TEXT_LENGTH));
		}

		InvalidRequestException rejected(String reason) {
			return new InvalidRequestException(
					"Import refusé : feuille « " + sheet.getSheetName() + " », ligne " + excelRow() + " : " + reason);
		}

		private ApplicationStatus status() {
			String label = text(cell(STATUS));
			ApplicationStatus status = (label == null) ? null : STATUS_BY_LABEL.get(label);
			if (status == null) {
				throw rejected("statut « " + (label == null ? "" : label) + " » inconnu.");
			}
			return status;
		}

		private LocalDate date(String heading) {
			Cell cell = cell(heading);
			if (text(cell) == null) {
				return null;
			}
			if (cellType(cell) != CellType.NUMERIC || !DateUtil.isCellDateFormatted(cell)) {
				throw rejected("« " + heading + " » (cellule " + cell.getAddress() + ") n'est pas une date.");
			}
			return cell.getLocalDateTimeCellValue().toLocalDate();
		}

		private String required(String heading, int maxLength) {
			String value = optional(heading, maxLength);
			if (value == null) {
				throw rejected("« " + heading + " » est vide.");
			}
			return value;
		}

		private String optional(String heading, int maxLength) {
			String value = text(cell(heading));
			if (value != null && value.length() > maxLength) {
				throw rejected("« " + heading + " » dépasse " + maxLength + " caractères (" + value.length() + ").");
			}
			return value;
		}

		private Cell cell(String heading) {
			return columns.cell(row, heading);
		}

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

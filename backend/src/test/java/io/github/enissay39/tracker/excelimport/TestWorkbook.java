package io.github.enissay39.tracker.excelimport;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Classeur fictif construit en mémoire pour les tests d'import : aucun fichier {@code .xlsx} dans le dépôt.
 */
final class TestWorkbook {

	static final String APPLICATIONS_SHEET = "Toutes les candidatures";

	static final String TO_EVALUATE_SHEET = "À évaluer";

	static final String DISCARDED_SHEET = "Abandonnées";

	static final List<String> TO_EVALUATE_HEADERS = List.of("Entreprise", "Poste", "CV prévu", "Remarque");

	static final List<String> DISCARDED_HEADERS = List.of("Entreprise", "Poste", "CV prévu", "Remarque", "Motif");

	static final List<String> APPLICATION_HEADERS = List.of("#", "Groupe", "Entreprise", "Poste", "Statut",
			"Envoyée le", "Échéance", "Date échéance", "Prochaine action", "Début", "Canal", "CV envoyé");

	private final XSSFWorkbook workbook = new XSSFWorkbook();

	private final CellStyle dateStyle;

	// Feuilles de pistes ajoutées vides à la fin si un test ne les a ni remplies ni retirées
	private final Set<String> omittedSheets = new HashSet<>();

	TestWorkbook() {
		dateStyle = workbook.createCellStyle();
		dateStyle.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
	}

	/**
	 * Feuille « Toutes les candidatures » comme dans le classeur : titre en ligne 1, compteurs en ligne 2, en-têtes
	 * en ligne 3, puis une ligne par tableau de valeurs (même ordre que les en-têtes).
	 */
	TestWorkbook applications(List<String> headers, Object[]... rows) {
		Sheet sheet = workbook.createSheet(APPLICATIONS_SHEET);
		write(sheet.createRow(0), "Suivi des candidatures fictives");
		write(sheet.createRow(1), "Total", rows.length, "En attente", 1);
		write(sheet.createRow(2), headers.toArray());
		for (int i = 0; i < rows.length; i++) {
			write(sheet.createRow(3 + i), rows[i]);
		}
		return this;
	}

	TestWorkbook applications(Object[]... rows) {
		return applications(APPLICATION_HEADERS, rows);
	}

	/** Feuille « À évaluer » : titre, compteurs, en-têtes en ligne 3, puis les pistes. */
	TestWorkbook toEvaluate(Object[]... rows) {
		return leads(TO_EVALUATE_SHEET, TO_EVALUATE_HEADERS, rows);
	}

	/** Feuille « Abandonnées », même disposition. */
	TestWorkbook discarded(Object[]... rows) {
		return leads(DISCARDED_SHEET, DISCARDED_HEADERS, rows);
	}

	TestWorkbook leads(String sheetName, List<String> headers, Object[]... rows) {
		Sheet sheet = workbook.createSheet(sheetName);
		write(sheet.createRow(0), "Pistes fictives");
		write(sheet.createRow(1), "Total", rows.length);
		write(sheet.createRow(2), headers.toArray());
		for (int i = 0; i < rows.length; i++) {
			write(sheet.createRow(3 + i), rows[i]);
		}
		return this;
	}

	/** Retire une feuille de pistes, pour tester son absence. */
	TestWorkbook without(String sheetName) {
		omittedSheets.add(sheetName);
		return this;
	}

	/** Feuille quelconque, à partir de la première ligne. */
	TestWorkbook sheet(String name, Object[]... rows) {
		Sheet sheet = workbook.createSheet(name);
		for (int i = 0; i < rows.length; i++) {
			write(sheet.createRow(i), rows[i]);
		}
		return this;
	}

	/** Ligne de candidature dans l'ordre de {@link #APPLICATION_HEADERS}. */
	static Object[] application(Object number, String group, String company, String jobTitle, String status,
			LocalDate sentOn, String deadlineLabel, LocalDate deadlineDate, String notes, String startPeriod,
			String channel, String cvSent) {
		return new Object[] { number, group, company, jobTitle, status, sentOn, deadlineLabel, deadlineDate, notes,
				startPeriod, channel, cvSent };
	}

	static Object[] application(Object number, String group, String status, LocalDate sentOn) {
		return application(number, group, "Fictif Aéro", "Stagiaire ingénieur logiciel", status, sentOn, null, null,
				null, null, null, null);
	}

	InputStream toInputStream() {
		return new ByteArrayInputStream(toBytes());
	}

	byte[] toBytes() {
		addMissingLeadSheet(TO_EVALUATE_SHEET, TO_EVALUATE_HEADERS);
		addMissingLeadSheet(DISCARDED_SHEET, DISCARDED_HEADERS);
		try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			workbook.write(out);
			return out.toByteArray();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	private void addMissingLeadSheet(String sheetName, List<String> headers) {
		if (workbook.getSheet(sheetName) == null && !omittedSheets.contains(sheetName)) {
			leads(sheetName, headers);
		}
	}

	private void write(Row row, Object... values) {
		for (int column = 0; column < values.length; column++) {
			Object value = values[column];
			if (value == null) {
				continue;
			}
			Cell cell = row.createCell(column);
			switch (value) {
				case Number number -> cell.setCellValue(number.doubleValue());
				case LocalDate date -> {
					cell.setCellValue(date);
					cell.setCellStyle(dateStyle);
				}
				default -> cell.setCellValue(value.toString());
			}
		}
	}

}

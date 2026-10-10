package io.github.enissay39.tracker.excelimport;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.List;

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

	static final List<String> APPLICATION_HEADERS = List.of("#", "Groupe", "Entreprise", "Poste", "Statut",
			"Envoyée le", "Échéance", "Date échéance", "Prochaine action", "Début", "Canal", "CV envoyé");

	private final XSSFWorkbook workbook = new XSSFWorkbook();

	private final CellStyle dateStyle;

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
		try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			workbook.write(out);
			return out.toByteArray();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
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

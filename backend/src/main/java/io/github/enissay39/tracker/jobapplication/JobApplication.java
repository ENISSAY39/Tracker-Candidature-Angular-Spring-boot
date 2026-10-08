package io.github.enissay39.tracker.jobapplication;

import java.time.Instant;
import java.time.LocalDate;

import io.github.enissay39.tracker.companygroup.CompanyGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Candidature : démarche suivie auprès d'un employeur pour un poste donné.
 */
@Entity
@Table(name = "job_application")
public class JobApplication {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Numéro métier : posé à la création, jamais modifié ensuite
	@Column(nullable = false, updatable = false)
	private Integer number;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_group_id", nullable = false)
	private CompanyGroup companyGroup;

	@Column(nullable = false)
	private String company;

	@Column(name = "job_title", nullable = false)
	private String jobTitle;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private ApplicationStatus status;

	@Column(name = "sent_on")
	private LocalDate sentOn;

	@Column(name = "deadline_label")
	private String deadlineLabel;

	@Column(name = "deadline_date")
	private LocalDate deadlineDate;

	@Column(columnDefinition = "text")
	private String notes;

	@Column(name = "start_period", length = 100)
	private String startPeriod;

	private String channel;

	@Column(name = "cv_sent")
	private String cvSent;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected JobApplication() {
	}

	public JobApplication(Integer number, CompanyGroup companyGroup, String company, String jobTitle,
			ApplicationStatus status) {
		this.number = number;
		this.companyGroup = companyGroup;
		this.company = company;
		this.jobTitle = jobTitle;
		this.status = status;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public Integer getNumber() {
		return number;
	}

	public CompanyGroup getCompanyGroup() {
		return companyGroup;
	}

	public void setCompanyGroup(CompanyGroup companyGroup) {
		this.companyGroup = companyGroup;
	}

	public String getCompany() {
		return company;
	}

	public void setCompany(String company) {
		this.company = company;
	}

	public String getJobTitle() {
		return jobTitle;
	}

	public void setJobTitle(String jobTitle) {
		this.jobTitle = jobTitle;
	}

	public ApplicationStatus getStatus() {
		return status;
	}

	public void setStatus(ApplicationStatus status) {
		this.status = status;
	}

	public LocalDate getSentOn() {
		return sentOn;
	}

	public void setSentOn(LocalDate sentOn) {
		this.sentOn = sentOn;
	}

	public String getDeadlineLabel() {
		return deadlineLabel;
	}

	public void setDeadlineLabel(String deadlineLabel) {
		this.deadlineLabel = deadlineLabel;
	}

	public LocalDate getDeadlineDate() {
		return deadlineDate;
	}

	public void setDeadlineDate(LocalDate deadlineDate) {
		this.deadlineDate = deadlineDate;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public String getStartPeriod() {
		return startPeriod;
	}

	public void setStartPeriod(String startPeriod) {
		this.startPeriod = startPeriod;
	}

	public String getChannel() {
		return channel;
	}

	public void setChannel(String channel) {
		this.channel = channel;
	}

	public String getCvSent() {
		return cvSent;
	}

	public void setCvSent(String cvSent) {
		this.cvSent = cvSent;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}

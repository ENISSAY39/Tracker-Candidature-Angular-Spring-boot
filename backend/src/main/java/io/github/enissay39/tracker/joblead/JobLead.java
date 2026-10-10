package io.github.enissay39.tracker.joblead;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Piste : annonce repérée pour laquelle aucune candidature n'existe encore, à évaluer ou écartée.
 */
@Entity
@Table(name = "job_lead")
public class JobLead {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String company;

	@Column(name = "job_title", nullable = false)
	private String jobTitle;

	@Column(name = "planned_cv")
	private String plannedCv;

	@Column(columnDefinition = "text")
	private String remark;

	// Renseigné si et seulement si la piste est écartée
	@Column(name = "discard_reason", columnDefinition = "text")
	private String discardReason;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private LeadState state;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected JobLead() {
	}

	/**
	 * Une piste naît à évaluer.
	 */
	public JobLead(String company, String jobTitle) {
		this.company = company;
		this.jobTitle = jobTitle;
		this.state = LeadState.TO_EVALUATE;
	}

	/**
	 * Passe la piste en écartée avec son motif, renseigné si et seulement si elle est écartée (ADR 0001).
	 */
	public void discard(String reason) {
		this.state = LeadState.DISCARDED;
		this.discardReason = reason;
	}

	/**
	 * Remet la piste à évaluer et efface son motif.
	 */
	public void restore() {
		this.state = LeadState.TO_EVALUATE;
		this.discardReason = null;
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

	public String getPlannedCv() {
		return plannedCv;
	}

	public void setPlannedCv(String plannedCv) {
		this.plannedCv = plannedCv;
	}

	public String getRemark() {
		return remark;
	}

	public void setRemark(String remark) {
		this.remark = remark;
	}

	public String getDiscardReason() {
		return discardReason;
	}

	public void setDiscardReason(String discardReason) {
		this.discardReason = discardReason;
	}

	public LeadState getState() {
		return state;
	}

	public void setState(LeadState state) {
		this.state = state;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}

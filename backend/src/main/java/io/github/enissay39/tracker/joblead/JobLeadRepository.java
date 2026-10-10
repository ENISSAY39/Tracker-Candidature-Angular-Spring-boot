package io.github.enissay39.tracker.joblead;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JobLeadRepository extends JpaRepository<JobLead, Long> {

	List<JobLead> findByState(LeadState state);

	/** Toutes les pistes, par date de création. */
	List<JobLead> findAllByOrderByCreatedAtAscIdAsc();

	/** Les pistes d'un état, par date de création. */
	List<JobLead> findByStateOrderByCreatedAtAscIdAsc(LeadState state);

}

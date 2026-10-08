package io.github.enissay39.tracker.joblead;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JobLeadRepository extends JpaRepository<JobLead, Long> {

	List<JobLead> findByState(LeadState state);

}

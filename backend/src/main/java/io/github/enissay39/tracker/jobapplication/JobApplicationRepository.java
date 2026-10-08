package io.github.enissay39.tracker.jobapplication;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

	/**
	 * Prochain numéro métier. Une valeur lue n'est jamais rendue à la séquence, même si la transaction échoue.
	 */
	@Query(value = "select cast(nextval('job_application_number_seq') as integer)", nativeQuery = true)
	int nextNumber();

	@Query("select a from JobApplication a join fetch a.companyGroup")
	List<JobApplication> findAllWithCompanyGroup();

	boolean existsByCompanyGroupId(Long companyGroupId);

}

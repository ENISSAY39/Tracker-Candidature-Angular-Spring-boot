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

	/**
	 * Recale la séquence des numéros sur le plus grand numéro en base : le prochain attribué sera ce maximum + 1.
	 * Sans candidature, la séquence n'est pas touchée.
	 */
	@Query(value = "select setval('job_application_number_seq', max(number)) from job_application", nativeQuery = true)
	Long alignNumberSequence();

	// Ordre stable par numéro ; le tri métier est fait par le front
	@Query("select a from JobApplication a join fetch a.companyGroup order by a.number")
	List<JobApplication> findAllWithCompanyGroup();

	boolean existsByCompanyGroupId(Long companyGroupId);

}

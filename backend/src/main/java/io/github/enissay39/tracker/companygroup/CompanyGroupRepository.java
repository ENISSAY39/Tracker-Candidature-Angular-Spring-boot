package io.github.enissay39.tracker.companygroup;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyGroupRepository extends JpaRepository<CompanyGroup, Long> {

	// lower() des deux côtés : même comparaison que l'index unique sur lower(name)
	@Query("select g from CompanyGroup g where lower(g.name) = lower(:name)")
	Optional<CompanyGroup> findByNameIgnoreCase(@Param("name") String name);

	@Query("select g from CompanyGroup g order by lower(g.name), g.id")
	List<CompanyGroup> findAllOrderedByName();

	/**
	 * Le groupe a-t-il au moins une candidature ? Requête SQL : le package des groupes ne dépend pas de celui des
	 * candidatures.
	 */
	@Query(value = "select exists (select 1 from job_application where company_group_id = :id)", nativeQuery = true)
	boolean hasApplications(@Param("id") Long id);

}

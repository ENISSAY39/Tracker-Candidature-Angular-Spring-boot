package io.github.enissay39.tracker.companygroup;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyGroupRepository extends JpaRepository<CompanyGroup, Long> {

	// lower() des deux côtés : même comparaison que l'index unique sur lower(name)
	@Query("select g from CompanyGroup g where lower(g.name) = lower(:name)")
	Optional<CompanyGroup> findByNameIgnoreCase(@Param("name") String name);

}

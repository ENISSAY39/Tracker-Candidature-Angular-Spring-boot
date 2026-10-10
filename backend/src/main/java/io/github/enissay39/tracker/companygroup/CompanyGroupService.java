package io.github.enissay39.tracker.companygroup;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CompanyGroupService {

	private final CompanyGroupRepository repository;

	public CompanyGroupService(CompanyGroupRepository repository) {
		this.repository = repository;
	}

	/**
	 * Groupe portant ce nom, nettoyé de ses espaces de début et de fin, sans tenir compte de la casse ; créé s'il
	 * n'existe pas. Un groupe trouvé garde sa graphie.
	 */
	@Transactional
	public CompanyGroup resolve(String name) {
		String cleanName = name.trim();
		return repository.findByNameIgnoreCase(cleanName).orElseGet(() -> repository.save(new CompanyGroup(cleanName)));
	}

}

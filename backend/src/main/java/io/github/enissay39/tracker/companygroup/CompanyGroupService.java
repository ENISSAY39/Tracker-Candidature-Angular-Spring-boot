package io.github.enissay39.tracker.companygroup;

import java.util.List;

import io.github.enissay39.tracker.common.ConflictException;
import io.github.enissay39.tracker.common.ResourceNotFoundException;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupRequest;
import io.github.enissay39.tracker.companygroup.dto.CompanyGroupResponse;
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
	 * Groupes triés par nom sans tenir compte de la casse.
	 */
	public List<CompanyGroupResponse> findAll() {
		return repository.findAllOrderedByName().stream().map(CompanyGroupMapper::toResponse).toList();
	}

	public long count() {
		return repository.count();
	}

	/**
	 * Supprime tous les groupes, une fois les candidatures supprimées. Réservé à l'import en mode remplacement.
	 */
	@Transactional
	public void deleteAll() {
		repository.deleteAllInBatch();
	}

	/**
	 * Groupe portant ce nom, nettoyé de ses espaces de début et de fin, sans tenir compte de la casse ; créé s'il
	 * n'existe pas. Un groupe trouvé garde sa graphie.
	 */
	@Transactional
	public CompanyGroup findOrCreate(String name) {
		String cleanName = name.trim();
		return repository.findByNameIgnoreCase(cleanName).orElseGet(() -> repository.save(new CompanyGroup(cleanName)));
	}

	/**
	 * Renomme le groupe ; refusé si un autre groupe porte déjà ce nom à la casse près (aucune fusion). Changer
	 * seulement la casse du même groupe est permis.
	 */
	@Transactional
	public CompanyGroupResponse rename(Long id, CompanyGroupRequest request) {
		CompanyGroup group = findExisting(id);
		String cleanName = request.name().trim();
		repository.findByNameIgnoreCase(cleanName)
			.filter(other -> !other.getId().equals(id))
			.ifPresent(other -> {
				throw new ConflictException("Le groupe « " + other.getName() + " » existe déjà.");
			});
		group.setName(cleanName);
		return CompanyGroupMapper.toResponse(group);
	}

	/**
	 * Supprime un groupe vide ; un groupe qui a des candidatures est conservé (409).
	 */
	@Transactional
	public void delete(Long id) {
		CompanyGroup group = findExisting(id);
		if (repository.hasApplications(id)) {
			throw new ConflictException(
					"Le groupe « " + group.getName() + " » a des candidatures : il ne peut pas être supprimé.");
		}
		repository.delete(group);
	}

	private CompanyGroup findExisting(Long id) {
		return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Groupe " + id + " introuvable."));
	}

}

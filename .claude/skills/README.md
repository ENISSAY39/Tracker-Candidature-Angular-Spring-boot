# Skills d'agent

Copie des skills d'ingénierie de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering)
(licence MIT, voir `LICENSE-mattpocock-skills`), commit `49dd158`, pour qu'elles soient chargées
dans les sessions Claude Code cloud du dépôt.

| Skill | Rôle |
|---|---|
| `implement` | Implémenter une issue : TDD aux seams convenus, tests, puis `code-review`, puis commit |
| `tdd` | Boucle red → green, une tranche verticale à la fois |
| `code-review` | Revue sur deux axes : standards du dépôt (`CLAUDE.md`) et spec (l'issue) |
| `codebase-design` | Vocabulaire des modules profonds, utilisé par `tdd` |

Adaptation locale : `disable-model-invocation` retiré de `implement`, pour que l'agent puisse
enchaîner les issues sans qu'on retape `/implement` à chaque fois.

Le tracker d'issues, les labels de triage et la doc de domaine sont décrits dans `docs/agents/`.

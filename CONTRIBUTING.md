# Contribuer

Le dépôt est la **source de vérité**. Toute évolution passe par une **pull request** ; rien ne se modifie depuis l'appli.

## Règles

1. **Une donnée certaine doit citer une source publique.** Ajoutez la source dans `data/registre/sources.json` avec `acces: "public"`, puis référencez son `id`. Les bases payantes (Mind Media, Médiamétrie, Décisionnel ACPM) ne sont **jamais republiées** : seules des valeurs publiquement rapportées (presse, communiqués, pages publiques) sont admises.
2. **Une estimation incertaine** va dans `data/estimation/overrides.json` avec `methode` et `confiance` (`haute | moyenne | faible`) — pas dans `certain/`.
3. **Un changement de méthodologie** (`data/estimation/parametres_modele.json`) doit porter une **justification** dans la description de la PR.
4. **La validation doit passer** : `node scripts/validate.js` (exécuté en CI).

## Ajouter un titre

1. `data/registre/titres.json` : ajoutez l'entrée (`id` slug stable, `famille`, `groupe`, `pure_player`, `acpm`).
2. Renseignez ce que vous pouvez sourcer publiquement dans `data/certain/*`.
3. À défaut, posez un override estimé (avec confiance) ou laissez le modèle estimer.

## Périmètre

Presse **grand public** avec offre numérique. **Presse pro/technique exclue.**

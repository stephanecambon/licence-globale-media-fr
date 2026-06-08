# CLAUDE.md — règles du projet

Simulateur public d'une **licence globale** pour la presse payante française : un pass unique tout-accès dont les revenus (abonnements **+** licences IA) sont redistribués aux éditeurs. Dépôt = données + moteur + appli statique. Lis **`SPEC.md`** avant toute modification : c'est la spécification de référence.

Langue de travail : **français** (code en anglais si besoin, mais commentaires, libellés et docs en français).

## Règles non négociables

1. **Trois couches, strictement séparées** (encodées dans l'arborescence `data/`) :
   - `certain/` = fait **sourcé publiquement** (jamais mutable hors PR).
   - `estimation/` = valeur calculée par méthode, ou override documenté (méthode + confiance).
   - `hypothese/` = leviers de scénario (manipulés en session dans l'appli, jamais persistés).
2. **Ne JAMAIS republier une base payante.** Mind Media, Médiamétrie, Décisionnel ACPM ne sont pas reproduits. Seules des **valeurs publiquement rapportées** entrent en couche certaine, via une source d'accès `public`.
3. **Un résultat n'a pas de couche.** Revenu projeté, Δ%, parts = **projections de scénario**, ni certaines ni estimées. Les badges (● sourcé / ≈ estimé) ne s'appliquent qu'aux **données d'entrée**.
4. **Toute valeur certaine cite une source enregistrée** dans `data/registre/sources.json` (avec `acces:"public"`). `scripts/validate.js` refuse une source inconnue ou payante.
5. **Le dépôt = source de vérité. Tout change par PR.** `validate.js` doit passer avant tout commit.

## Discipline de build (appli)

- **N'édite jamais `docs/index.html` ni à la main.** C'est un **artefact généré**.
- La source éditable est **`app/index.src.html`** (UI + style, avec les emplacements `/*__MODEL__*/` et `/*__DATA__*/`).
- `app/build.js` injecte le moteur **`model/model.js` tel quel** (en retirant les `export`) + le dataset assemblé, et écrit `docs/index.html` (+ `docs/.nojekyll`).
- **Ne duplique jamais la logique du modèle** dans l'appli : `model/model.js` est l'unique source. Si le calcul doit changer, change `model.js`, puis rebuild.
- Après toute modif de données, de modèle ou de gabarit : `node app/build.js`.

## Commandes

```bash
node scripts/validate.js     # intégrité titres/sources + règle anti-source-payante (doit passer)
node scripts/couverture.js   # couverture par métrique et par couche (honnêteté des données)
node scripts/run.js          # exécute un scénario et imprime KPIs + top éditeurs
node app/build.js            # régénère docs/index.html depuis les JSON + model.js
```

## Données : méthodes d'estimation

Tout est dans `data/estimation/parametres_modele.json` (figé, non exposé comme levier dans l'appli). Voir `SPEC.md` §5.1 pour le détail des coefficients. Cascade de résolution (avec couche) : `abonnes_num` (déclaration éditeur → override → `diffusion × conv[famille]` → défaut), `visites` (ACPM → `abonnés × visites_par_abonné[famille]`), `pages_vues` (ACPM → `visites × pages_par_visite[famille]`), `arpu` (override → défaut famille, **jamais un prix catalogue**), `audience` (clé au choix = **visites** ou **pages vues**, deux vraies métriques ACPM ; visiteurs uniques & temps de lecture exclus car Médiamétrie payant).

État de la couverture (au tag courant) : 84 titres · **77 diffusions, 62 visites, 59 pages vues, 7 abonnés** sourcés · le reste estimé, ce qui est **assumé et documenté** dans `couverture.js`. Ne pas « combler » une estimation par un chiffre inventé : soit une source publique existe (PR), soit ça reste estimé.

## Déploiement

GitHub Pages, depuis `docs/`, via `.github/workflows/deploy.yml` (Source Pages = "GitHub Actions"). Le workflow valide, build et publie. Appli **statique, lecture seule** : elle n'écrit rien, ne lit rien côté serveur.

## Style

Garder la concision et l'honnêteté épistémique : signaler explicitement les limites et les incertitudes, citer les sources, ne pas survendre une précision qu'on n'a pas.

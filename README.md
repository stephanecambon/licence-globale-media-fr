# Licence globale presse — simulateur

Modèle économique **ouvert et reproductible** d'une **licence globale** pour la presse payante française : un abonnement unique tout-accès (SSO), dont les revenus — **pool abonnés** + **pool IA (droits voisins)** — sont redistribués aux éditeurs.

> Outil pédagogique et **simulateur**, pas la chambre de compensation réelle. Limites assumées dans [`SPEC.md`](SPEC.md) §8.

**▶ Appli en ligne :** `https://<votre-compte>.github.io/licence-globale-presse/`
*(remplacer `<votre-compte>` ; déploiement automatique via GitHub Pages, voir ci-dessous)*

## L'appli

Explorateur **statique, build-free, lecture seule**. Un rail « Ton scénario » (prix du pass, migration, net-new, part apporteur, clé d'audience, enveloppe IA) qui **recalcule en direct** via le moteur, une page Marché (KPI + top éditeurs gagnants/perdants) et une **fiche éditeur** (décomposition du revenu : vos abonnés / net-new / audience / droits voisins IA, et saisie locale de vos vrais chiffres). État du scénario partageable par URL.

- Source éditable : `app/index.src.html` (UI + style).
- `app/build.js` injecte le moteur `model/model.js` **tel quel** + les données, et génère `docs/index.html`.
- **Ne jamais éditer `docs/index.html` à la main** — c'est un artefact généré.

## Démarrage

```bash
node scripts/validate.js     # intégrité des données + règle anti-source-payante (doit passer)
node scripts/couverture.js   # couverture par métrique et par couche (honnêteté des données)
node scripts/run.js          # exécute les scénarios et imprime KPI + top éditeurs
node app/build.js            # régénère docs/index.html depuis les JSON + model.js
```

Aucune dépendance, aucun build outillé (Node ≥ 18, modules ES).

## Structure

- [`SPEC.md`](SPEC.md) — spécification complète (**à lire en premier**).
- [`CLAUDE.md`](CLAUDE.md) — règles de contribution pour un agent (Claude Code) ou un humain.
- `data/` — données en **trois couches** : `certain/` (sourcé public), `estimation/` (méthodes + overrides), `hypothese/` (leviers + scénarios). Schémas dans `data/DICTIONNAIRE.md`.
- `model/model.js` — le moteur (deux pools), module ES pur, **source unique** de la logique.
- `app/` — gabarit + script de build de l'appli ; `docs/` — l'appli générée (servie par Pages).
- `scripts/` — chargement, validation (CI), couverture, démonstration.

## Les trois couches

Toute valeur est **certaine** (fait sourcé publiquement), **estimée** (calculée ou override documenté), ou une **hypothèse** (levier de scénario). La couche certaine ne contient **que du publiquement citable** : les bases payantes (Mind Media, Médiamétrie, Décisionnel ACPM) sont **citées, jamais republiées**. Un **résultat** (revenu projeté, Δ%, parts) n'a **pas de couche** — c'est une projection.

État au tag courant : **84 titres** · 77 diffusions, 62 visites, 7 abonnés sourcés · le reste estimé, **documenté** par `couverture.js`.

## Contribuer

Le dépôt est la **source de vérité** ; tout change par **PR** (voir [`CONTRIBUTING.md`](CONTRIBUTING.md)) :
- une valeur en `certain/` exige une **source publique enregistrée** dans `data/registre/sources.json` (`acces: "public"`) ;
- `node scripts/validate.js` **doit passer** avant tout commit ;
- on n'invente pas un chiffre pour « combler » : soit une source publique existe, soit la valeur reste estimée.

## Déploiement

GitHub Pages depuis `docs/`, via `.github/workflows/deploy.yml` (valide → build → publie). Réglage unique : *Settings → Pages → Source = « GitHub Actions »*.

## Licence

Données et modèle : **CC-BY-4.0**. Voir [`LICENSE`](LICENSE).

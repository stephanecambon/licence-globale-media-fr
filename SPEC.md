# Licence globale presse — spécification

Simulateur économique d'une **licence globale** pour la presse payante française : un abonnement unique + un identifiant commun (SSO) donnant accès à tous les titres payants, dont les revenus (abonnements **et** licences IA) sont redistribués aux éditeurs. Outil **public, ouvert, reproductible**.

Version : 1.0 · Statut : fondation (données + modèle + spec). L'appli web est la phase suivante.

---

## 1. Objet et utilisateurs

- **Analystes / journalistes / décideurs** : explorer l'effet systémique d'une licence globale sur le marché (revenu total, payeurs, gagnants/perdants).
- **Éditeurs** : évaluer l'effet sur *leur* titre, et corriger les estimations par leurs vrais chiffres (en local, jamais persistés).

L'appli est un **explorateur en lecture seule** : elle ne modifie jamais le dépôt. Toute évolution des données ou de la modélisation passe par une PR (voir §6).

## 2. Périmètre

Titres **grand public** ayant une **offre d'abonnement numérique**. **Presse professionnelle / technique exclue** (famille ACPM distincte).

Familles : `PQN`, `PQR`, `magazine-news`, `magazine-eco`, `pure-player`. Le filtre « a une offre numérique » écarte naturellement l'essentiel de la PHR et des magazines TV/people/loisirs, ramenant le périmètre pertinent à ~80-120 titres. Le registre couvre **84 titres** : PQN et PQR complètes (classements ACPM 2025), hebdomadaires nationaux (JDD, La Tribune Dimanche), magazines d'information, d'économie et de connaissance, et principaux pure-players. La complétion (petits magazines, PHR) se poursuit par PR.

## 3. Les trois couches (principe central)

La crédibilité du modèle public repose sur une séparation stricte, **encodée dans l'arborescence** :

| Couche | Définition | Où | Mutable par l'utilisateur ? |
|---|---|---|---|
| **certaine** | fait sourcé **publiquement** | `data/certain/` | non (PR) |
| **estimation** | valeur dérivée (méthode) ou override documenté | `data/estimation/` | non (PR) |
| **hypothèse** | levier de scénario | `data/hypothese/` | oui, en session (éphémère) |

Règles :
- La couche **certaine ne contient que des valeurs publiquement citables**. Les bases payantes (Mind Media, Médiamétrie, Décisionnel ACPM) ne sont **jamais republiées** — seules des valeurs publiquement rapportées les alimentent, via une source d'accès `public`.
- Les **estimations ne sont pas figées** : elles sont recalculées par le modèle à partir des méthodes (`parametres_modele.json`). Seuls les overrides (faute d'ancrage calculable) sont posés à la main, avec **méthode + confiance**.
- Un **résultat** (revenu projeté, Δ%, parts) n'est **ni certain ni estimé** : c'est une **projection de scénario**. Les badges de couche ne s'appliquent qu'aux **données d'entrée**, jamais aux résultats.

## 4. Architecture des données

Fichiers plats **JSON**, build-free (chargés tels quels par l'appli). Un fichier par métrique dans la couche certaine. Voir `data/DICTIONNAIRE.md` pour les schémas.

```
data/
├── registre/
│   ├── titres.json          épine dorsale : id → {nom, famille, groupe, pure_player, acpm}
│   └── sources.json         id → {citation, url, acces, date}
├── certain/                 valeurs sourcées publiques uniquement (clairsemé = honnête)
│   ├── abonnes_num.json     7 titres (déclarations éditeurs / Mind rapporté publiquement)
│   ├── diffusion_payee.json 77 titres (DFP ACPM 2025)
│   ├── visites.json         62 titres (ACPM, classement unifié avril 2026)
│   ├── pages_vues.json      59 titres (ACPM, même classement — Pages Vues Totales)
│   └── marche.json          agrégats marché (total abonnements, etc.)
├── estimation/
│   ├── parametres_modele.json  méthodes + coefficients (NON exposé dans l'appli)
│   └── overrides.json          estimations posées à la main (+ confiance)
└── hypothese/
    └── hypotheses.json      leviers + presets de scénarios
```

Format d'un fichier-métrique : un bloc `_meta` (métrique, unité, source/période par défaut) et un bloc `valeurs` clé par `titre_id`. Une valeur = un nombre (source héritée du `_meta`) ou un objet `{ valeur, source, periode }` quand elle diffère.

## 5. Le moteur de calcul (`model/model.js`)

Module ES pur (navigateur + Node). Deux pools.

**Résolution par titre** (cascade, avec couche) :
- `abonnes_num` : certain (déclaration éditeur) → override → `diffusion_payee × conv_diffusion_abonnes[famille]` → défaut famille.
- `visites` (audience numérique mensuelle) : certain (ACPM, classement unifié) → `abonnes_num × visites_par_abonne[famille]`.
- `pages_vues` (pages vues mensuelles) : certain (ACPM, même classement) → `visites × pages_par_visite[famille]`.
- `arpu` (ARPU abonnement mensuel **estimé**, jamais un prix catalogue) : override → défaut de famille. Rarement public ; seul Mediapart est calculé sur son CA réel.

**Agrégats** : `payeurs_actuels = Σ abonnes / dédoublonnage (1,27)` ; `revenu_actuel_i = abonnes_i × arpu_i × 12`. La **longue traîne** = `total_marché_certifié − Σ titres connus`, caractérisée par les moyennes de `parametres_modele.longue_traine`.

**Pool abonnés** : `payeurs_bundle = migration × payeurs_actuels + net_new` ; `revenu_bundle = payeurs_bundle × prix_pass × 12`.
- `pool_apporteur = part_apporteur × revenu_bundle`, réparti à la **part de base** de chaque titre (migrants → leur titre ; net-new → prorata de la base actuelle = force d'acquisition). L'apporteur = simplement le % de la licence payée par les abonnés qu'il a apportés.
- `pool_audience = (1 − part_apporteur) × revenu_bundle`, réparti par la **clé d'audience** = une **vraie métrique ACPM** du titre, au choix : **`visites`** (défaut) ou **`pages_vues`** (certaines ACPM sinon estimées). Les deux sont publiées au Classement Unifié ACPM et redistribuent différemment (un titre très engageant, pages/visite élevé, pèse davantage en pages vues). Métriques **écartées** car non sourçables publiquement : visiteurs uniques et temps de lecture relèvent de **Médiamétrie** (payant) → exclus par la règle anti-source-payante. Les visites remplacent l'ancien proxy `abonnés × coef`.

**Pool IA** : `pool_ia = enveloppe_ia`, réparti **à 100 %** par la **clé d'inférence brute** (modèle TollBit) — `indice_inference_i = abonnes_i × inference_coef[famille]`.
- **Pas de take rate** : hypothèse explicite d'une structure gérée par les éditeurs, frais de gestion hors périmètre.
- Méthode d'estimation des inférences = dans le modèle (figé), pas exposée comme levier.

**Coexistence (résiduel individuel)** : la migration est partielle. Les abonnés **non migrés** continuent de payer leur abonnement individuel, donc l'éditeur conserve `residuel_i = (1 − migration) × revenu_actuel_i`. Sans ce terme, le modèle effaçait à tort le CA des non-migrés (à migration 0 % il tombait au seul pool IA, ce qui est faux).

**Par titre** : `revenu_projeté_i = residuel_i + apporteur_i + audience_i + ia_i` ; `Δ_i = revenu_projeté_i / revenu_actuel_i − 1`. À migration 0 % et IA 0, `revenu_projeté_i = revenu_actuel_i` (Δ = 0) ; à migration 100 %, le résiduel s'annule (tout le monde sur le pass).

⚠ **Effet du dédoublonnage (1,27) sur le prix d'équilibre** : à migration 100 %, un payeur du pass remplace ~1,27 abonnement individuel. Le pass ne préserve donc le CA d'abonnement que si `prix_pass ≳ 1,27 × ARPU moyen` (≈ 14 €/mois sur le périmètre actuel) ; en dessous, perte systémique — c'est structurel, pas un bug.

**KPI** : revenu total (`residuel_total + revenu_bundle + pool_ia`, avec `residuel_total = (1 − migration) × revenu_actuel_total`) + Δ vs aujourd'hui ; payeurs + Δ ; pool abonnements ; pool IA (marqué « nouveau », pas un %).

### 5.1 Méthodes et coefficients d'estimation

Tous dans `data/estimation/parametres_modele.json` (figés, non exposés comme leviers). Premier jet calibrable par PR.

| Métrique | Méthode (après certain/override) | Coefficients par famille |
|---|---|---|
| `abonnes_num` | `diffusion_payee × conv_diffusion_abonnes` | PQN 0,45 · PQR 0,15 · magazines 0,30–0,35 |
| `visites` | `abonnes_num × visites_par_abonne` | PQN 500 · PQR 2000 · mag-news 700 · mag-eco 400 · mag-conn 700 · pure-player 250 |
| `pages_vues` | `visites × pages_par_visite` | PQN 1,7 · PQR 2,0 · mag-news 1,6 · mag-eco 1,4 · mag-conn 1,55 · pure-player 1,6 (médianes des 59 paires certaines) |
| `arpu` (€/mois) | défaut de famille (override si CA/abonnés ou positionnement public) | ex. Mediapart 9,1 (CA/abonnés) · Les Échos 25 · Le Monde 13 · Le Figaro 14,5 |
| clé d'audience | métrique ACPM au choix : `visites` (défaut) **ou** `pages_vues` | 2 options réelles ; visiteurs uniques & temps de lecture exclus (Médiamétrie payant) |
| `indice_inference` | `abonnes_num × inference_coef` | **100 % notionnel** (aucune donnée publique) |
| longue traîne | `total_marché_certifié − Σ titres connus`, profil moyen | arpu 8 · visites/abonné 400 · pages/visite 1,7 · inference_coef |
| dédoublonnage | multi-abonnements par payeur | 1,27 |

⚠ La conversion **diffusion → abonnés** est volontairement prudente : sur les 4 titres où l'on connaît les deux (Le Monde, Le Figaro, L'Équipe, Les Échos), le ratio abonnés/diffusion va de **0,60 à 1,26** — trop dispersé pour un coefficient fiable. C'est pourquoi on privilégie les **déclarations éditeurs** quand elles existent.

## 6. Gouvernance

- **Le dépôt = source de vérité.** Trois choses changent, toutes par **PR reviewée** : données certaines (avec source publique), méthodo (`parametres_modele`), défauts/presets d'hypothèses.
- **L'appli = lecture seule.** Sliders et saisie éditeur = éphémères, non persistés.
- **CI** (`scripts/validate.js`) sur chaque PR : intégrité des `titre_id`, sources existantes, règle « aucune valeur certaine sur source payante ».
- **Reproductibilité** : méthodo versionnée → résultats citables par tag (« modèle v1.x »).
- Voir `CONTRIBUTING.md`.

## 7. Interface (phase suivante)

Appli statique (GitHub Pages), build-free, lit les JSON.

**Page principale (Marché)**
- Rail « Ton scénario » (seuls éléments manipulables), deux sections jumelles :
  - **Abonnés** : prix du pass, migration, net-new payeurs, part à l'apporteur (50 %), clé d'audience (2 options : visites / pages vues). Un `(i)` par levier.
  - **Pool IA** : enveloppe IA. Réparti aux inférences brutes (méthode → modèle figé).
- Cartouches KPI avec **% d'évolution** vs aujourd'hui (pool IA = « nouveau »).
- Tableau **top 10 éditeurs** : titre, abonnés (+ badge de couche), Δ revenu. Clic ligne → fiche éditeur.
- Code couleur des trois couches partout ; provenance d'une valeur au clic (source/date ou méthode/confiance) ; partage de scénario par paramètres d'URL.

**Fiche éditeur (drill-down)**

Même langage visuel que la page Marché (rail « Ton scénario » identique à gauche, mêmes cartouches, mêmes pastilles de couche). Accès par **clic sur une ligne du top 10** ou par le **toggle Marché / Éditeur** en barre haute. Exemple de référence : **Les Échos** (cas pédagogique d'un titre *perdant*).

1. **En-tête** : titre, famille, groupe, abonnés (+ badge de couche) ; **pastille verdict** gagnant/perdant + Δ global.
2. **Deux cartouches** : *Revenu abonnement actuel* (= abonnés × ARPU × 12) ; *Revenu projeté « licence globale »* + Δ.
3. **« D'où viendraient vos revenus »** : une **barre totale cumulée** (Total projeté, segmentée par les 4 revenus) **au-dessus du détail**, puis **une barre par revenu** :
   - **Vos abonnés** — part apporteur venant des abonnés actuels qui migrent.
   - **Net new payeurs que vous recrutez** — part apporteur venant des nouveaux payeurs (au prorata de la base = force d'acquisition).
   - **Revenus licence globale liés à votre audience** — part du pool audience (clé visites ou pages vues).
   - **Droits voisins IA** — part du pool IA (inférences).
   Le pool apporteur du titre est scindé entre les deux premières barres selon la composition du pass dans le scénario (migrants vs net-new).
4. **« Votre poids dans la répartition »** : parts du titre dans les trois clés — base abonnés, audience (selon la clé active : visites ou pages vues), inférences IA. Ce sont des **projections** ; au survol, chacune indique la **couche de la clé sous-jacente** (sourcée si métrique ACPM, estimée sinon).
5. **« Je suis cet éditeur »** : saisie **locale, éphémère, jamais persistée** — abonnés (couche affichée), ARPU réel, **visites/mois** et **pages vues/mois** (les deux clés d'audience ACPM). Remplace nos estimations par les vrais chiffres et recalcule la fiche en direct ; les valeurs publiques validées reviennent par PR.

Volontairement **écartés** de la fiche (décisions de conception) : la part du revenu *marché actuel*, le cartouche d'explication « pourquoi vous gagnez/perdez » et la liste de leviers — pour garder une fiche centrée sur la **décomposition du revenu**, pas sur le commentaire.

## 8. Limites et honnêteté

- `abonnes_num` : **7 titres sourcés** (déclarations éditeurs — Le Monde 602 k, Le Figaro 335 k, L'Équipe 300 k, Mediapart 257 k, Ouest-France 200 k, Le Parisien 100 k+, Les Échos 85 k), **77 estimés**. Le baromètre Mind Media (payant) n'est pas republiable ; fin 2025, seuls **8 titres** dépassent 100 k abonnés numériques → pour l'immense majorité, l'estimation est la seule voie.
- **La diffusion numérique ACPM ≠ abonnés numériques.** L'ACPM distingue « version numérique de type PDF » (réplique homothétique du papier) et « édition numérique », et le détail numérique par titre est **réservé aux adhérents**. On n'ancre donc **pas** `abonnes_num` dessus : seules les déclarations éditeurs (abonnés tout-accès) le font.
- `visites` : **62 titres sourcés** (ACPM, classement unifié avril 2026), 22 estimés (régionaux du groupe SIPA/Ouest-France consolidés dans actu.fr et ouest-france.fr ; pure-players hors ACPM ; magazines de niche).
- `pages_vues` : **59 titres sourcés** (ACPM, même classement, colonne Pages Vues Totales), 25 estimés (`visites × pages_par_visite[famille]`). Seconde clé d'audience au choix. Visiteurs uniques et temps de lecture réel restent **hors d'atteinte** (Médiamétrie, payant) → exclus de la couche certaine ; visites et pages vues sont les meilleurs proxys publics.
- **Cohérence temporelle** : diffusion ACPM = moyenne **2025** ; visites = **avril 2026** ; abonnés éditeurs = dates variées. Deux métriques distinctes, donc acceptable, mais à réaligner si l'on vise une photo à date unique.
- Les inférences IA ne sont **pas mesurables** par nous → l'indice d'inférence est **100 % notionnel** ; le modèle est un **simulateur**, pas la chambre de compensation réelle.
- Les coefficients de `parametres_modele.json` sont un **premier jet** à dire d'expert — la conversion diffusion→abonnés est notoirement dispersée (0,60 à 1,26 sur les ancres PQN) — **destinés à être affinés par PR**.

## 9. Roadmap

1. ✅ Périmètre ACPM (84 titres) · **77 diffusions, 62 visites, 59 pages vues, 7 abonnés** sourcés · clé d'audience sur 2 vraies métriques ACPM (visites / pages vues) · modèle codé + validation + spec + appli (fiche éditeur incluse).
2. Compléter la marge (magazines de connaissance, PHR, pure-players) par PR.
3. Construire l'appli web (page principale puis fiche éditeur).
4. Affiner les coefficients d'estimation (familles, inférence) avec données publiques additionnelles.
5. Option avancée : clé d'audience *user-centric* ; sous-pool IA entraînement/usage.

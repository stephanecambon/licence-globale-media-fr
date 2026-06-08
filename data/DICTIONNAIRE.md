# Dictionnaire de données

Conventions : encodage **UTF-8**, décimales en **point**, dates **ISO** (`AAAA` ou `AAAA-MM`), identifiants en **slugs stables** (`le-monde`). Pas de séparateurs de milliers dans les données.

Toute valeur appartient à une **couche** : `certain` / `estimation` / `hypothese` (voir `SPEC.md` §3).

---

## `registre/titres.json`

```
titres: {
  "<id>": { nom, famille, groupe, pure_player: bool, acpm: bool }
}
```
`famille` ∈ `PQN | PQR | magazine-news | magazine-eco | pure-player`. `id` = clé de jointure universelle.

## `registre/sources.json`

```
sources: {
  "<id>": { citation, url, acces: "public" | "payant", date }
}
```
Une valeur **certaine** doit pointer une source `public`. Les sources `payant` ne servent jamais de valeur certaine (règle vérifiée en CI).

## `certain/<metrique>.json` (un fichier par métrique)

```
{
  "_meta": { metrique, libelle, unite, couche: "certain", source, periode, note },
  "valeurs": {
    "<id>": <nombre>                                  // source/période héritées du _meta
    "<id>": { valeur, source?, periode? }             // surcharge ponctuelle
  }
}
```
Métriques fournies : `abonnes_num`, `diffusion_payee`. Cas particulier `marche.json` : les clés sont des agrégats marché (non des `titre_id`), chaque valeur portant sa propre source.

## `estimation/parametres_modele.json`

Méthodologie (jamais des valeurs figées). Blocs : `familles` (défauts par famille), `abonnes_num` (cascade), `arpu` (ARPU estimé : override → défaut famille), `cle_audience` (options + facteurs), `indice_inference`, `longue_traine`, `conversions` (`dedoublonnage`), `attribution_net_new`. **Non exposé dans l'appli ; modifiable par PR uniquement.**

## `estimation/overrides.json`

```
{
  "<metrique>": { "<id>": { valeur, confiance: "haute|moyenne|faible", methode, source? } }
}
```
Estimations posées à la main, là où aucun ancrage calculable n'existe. Métriques : `abonnes_num`, `arpu`.

## `hypothese/hypotheses.json`

```
leviers: { prix_pass, taux_migration, net_new, part_apporteur, cle_audience, enveloppe_ia }  // chacun: valeur, unite, min, max, pas, aide
scenarios: { cannibalisation, expansion, streaming }  // surcharges des leviers
defaut: "<nom de scénario>"
```
Valeurs par défaut et presets : modifiables par PR. Manipulation en session : éphémère.

---

## Valeur résolue (sortie du modèle)

Le moteur renvoie, par couple (titre, métrique), un objet :
```
{ valeur, couche: "certain"|"estimation"|"inconnu", source? , methode?, confiance? }
```
Cascade : certain → override → calcul → défaut → inconnu (jamais inventé).

// Modèle « licence globale presse » — moteur de calcul.
// Module ES pur (aucune I/O) : utilisable tel quel par l'appli (navigateur) et par Node (scripts).
//
// Conventions de couches :
//   - certain    : valeur sourcée publiquement (data/certain/*)
//   - estimation : valeur calculée (cascade) ou override (data/estimation/*)
//   - hypothese  : levier de scénario (data/hypothese/hypotheses.json)
//   - resultat   : projection issue d'un scénario (n'est NI certaine NI estimée)
//
// Un « dataset » attendu :
//   { titres, sources, certain: {metrique:{_meta,valeurs}}, parametres, overrides, marche }

function num(v) {
  // Une valeur de fichier-métrique est soit un nombre, soit { valeur, ... }
  if (v == null) return null;
  return typeof v === "object" ? v.valeur : v;
}

function certainOf(dataset, metrique, id) {
  const f = dataset.certain[metrique];
  if (!f || !f.valeurs || !(id in f.valeurs)) return null;
  const raw = f.valeurs[id];
  return { valeur: num(raw), couche: "certain", source: (typeof raw === "object" && raw.source) || f._meta.source };
}

function overrideOf(dataset, metrique, id) {
  const f = dataset.overrides[metrique];
  if (!f || !(id in f)) return null;
  const o = f[id];
  return { valeur: o.valeur, couche: "estimation", methode: o.methode, confiance: o.confiance };
}

// ---- Résolution d'une valeur par titre (cascade + couche) ----------------

export function resoudreAbonnes(dataset, id, famille) {
  const c = certainOf(dataset, "abonnes_num", id);
  if (c) return c;
  const o = overrideOf(dataset, "abonnes_num", id);
  if (o) return o;
  const diff = certainOf(dataset, "diffusion_payee", id);
  const fam = dataset.parametres.familles[famille];
  if (diff && fam) {
    return { valeur: Math.round(diff.valeur * fam.conv_diffusion_abonnes),
             couche: "estimation", methode: "diffusion_payee * conv_diffusion_abonnes", confiance: "faible" };
  }
  const def = dataset.parametres.abonnes_num.abonnes_defaut_par_famille[famille];
  if (def != null) {
    return { valeur: def, couche: "estimation", methode: "défaut famille", confiance: "faible" };
  }
  return { valeur: null, couche: "inconnu" };
}

export function resoudreArpu(dataset, id, famille) {
  // ARPU abonnement mensuel ESTIMÉ (jamais un prix catalogue) : override sinon défaut de famille.
  const o = overrideOf(dataset, "arpu", id);
  if (o) return o;
  const fam = dataset.parametres.familles[famille];
  return { valeur: fam ? fam.arpu_defaut : null, couche: "estimation", methode: "ARPU défaut famille", confiance: "faible" };
}

// Visites mensuelles : certaines (ACPM) sinon estimées (abonnés × visites_par_abonné de la famille).
export function resoudreVisites(dataset, id, famille, abonnes) {
  const c = certainOf(dataset, "visites", id);
  if (c) return c;
  const fam = dataset.parametres.familles[famille];
  const r = fam && fam.visites_par_abonne != null ? fam.visites_par_abonne : 0;
  return { valeur: (abonnes || 0) * r, couche: "estimation",
           methode: "abonnés × visites_par_abonné (famille)", confiance: "faible" };
}

// Pages vues mensuelles : certaines (ACPM) sinon estimées (visites résolues × pages_par_visite de la famille).
export function resoudrePagesVues(dataset, id, famille, visites) {
  const c = certainOf(dataset, "pages_vues", id);
  if (c) return c;
  const fam = dataset.parametres.familles[famille];
  const r = fam && fam.pages_par_visite != null ? fam.pages_par_visite : 0;
  return { valeur: Math.round((visites || 0) * r), couche: "estimation",
           methode: "visites × pages_par_visite (famille)", confiance: "faible" };
}

// ---- Profil résolu d'un titre -------------------------------------------

export function profilTitre(dataset, id) {
  const t = dataset.titres[id];
  const famille = t.famille;
  const abonnes = resoudreAbonnes(dataset, id, famille);
  const arpu = resoudreArpu(dataset, id, famille);
  const fam = dataset.parametres.familles[famille] || { inference_coef: 1 };
  const a = abonnes.valeur || 0;
  const visites = resoudreVisites(dataset, id, famille, a);
  const pagesVues = resoudrePagesVues(dataset, id, famille, visites.valeur);
  return {
    id, nom: t.nom, famille, groupe: t.groupe, pure_player: t.pure_player,
    abonnes, arpu, visites, pagesVues,
    revenuActuel: a * (arpu.valeur || 0) * 12,
    indiceInference: a * fam.inference_coef
  };
}

// Indice d'audience d'un titre selon la clé choisie (métrique ACPM réelle : visites ou pages vues).
export function indiceAudience(profil, cleAudience) {
  const m = cleAudience === "pages_vues" ? profil.pagesVues : profil.visites;
  return (m && m.valeur) || 0;
}

// ---- Calcul d'un scénario -----------------------------------------------

export function runModel(dataset, hypotheses) {
  const h = hypotheses;
  const cleAudience = h.cle_audience === "pages_vues" ? "pages_vues" : "visites";

  // Profils des titres connus
  const profils = Object.keys(dataset.titres).map((id) => profilTitre(dataset, id));

  // Longue traîne = résidu vs total marché certifié
  const totalAbonnementsConnus = profils.reduce((s, p) => s + (p.abonnes.valeur || 0), 0);
  const totalMarche = num(dataset.marche.total_abonnements_numeriques);
  const lt = dataset.parametres.longue_traine;
  const abonnesLT = Math.max(0, totalMarche - totalAbonnementsConnus);
  if (abonnesLT > 0) {
    profils.push({
      id: "longue-traine", nom: "Longue traîne (reste du marché)", famille: "longue-traine",
      groupe: "—", pure_player: false,
      abonnes: { valeur: abonnesLT, couche: "estimation", methode: "total marché - titres connus", confiance: "faible" },
      arpu: { valeur: lt.arpu_defaut, couche: "estimation", methode: "défaut longue traîne", confiance: "faible" },
      revenuActuel: abonnesLT * lt.arpu_defaut * 12,
      visites: { valeur: abonnesLT * (lt.visites_par_abonne || 0), couche: "estimation", methode: "longue traîne × visites_par_abonné", confiance: "faible" },
      pagesVues: { valeur: Math.round(abonnesLT * (lt.visites_par_abonne || 0) * (lt.pages_par_visite || 0)), couche: "estimation", methode: "longue traîne : visites × pages_par_visite", confiance: "faible" },
      indiceInference: abonnesLT * lt.inference_coef
    });
  }

  // Agrégats
  const dedup = dataset.parametres.conversions.dedoublonnage_abonnements_payeurs;
  const totalAbonnements = profils.reduce((s, p) => s + (p.abonnes.valeur || 0), 0);
  const payeursActuels = totalAbonnements / dedup;
  const revenuActuelTotal = profils.reduce((s, p) => s + p.revenuActuel, 0);

  // Périmètre du pass
  const payeursBundle = h.taux_migration * payeursActuels + h.net_new;
  const revenuBundle = payeursBundle * h.prix_pass * 12;

  // Pools
  const poolApporteur = h.part_apporteur * revenuBundle;
  const poolAudience = (1 - h.part_apporteur) * revenuBundle;
  const poolIA = h.enveloppe_ia;

  const sommeBase = totalAbonnements || 1;
  const sommeAudience = profils.reduce((s, p) => s + indiceAudience(p, cleAudience), 0) || 1;
  const sommeInference = profils.reduce((s, p) => s + p.indiceInference, 0) || 1;

  // Coexistence : les abonnés NON migrés continuent de payer leur abonnement individuel.
  const partNonMigree = 1 - h.taux_migration;

  const titres = profils.map((p) => {
    const partBase = (p.abonnes.valeur || 0) / sommeBase;            // force d'acquisition (apporteur)
    const partAudience = indiceAudience(p, cleAudience) / sommeAudience;
    const partInference = p.indiceInference / sommeInference;
    const revResiduel = partNonMigree * p.revenuActuel;             // abonnés restés en individuel
    const revApporteur = poolApporteur * partBase;
    const revAudience = poolAudience * partAudience;
    const revIA = poolIA * partInference;
    const revenuProjete = revResiduel + revApporteur + revAudience + revIA;
    const delta = p.revenuActuel > 0 ? revenuProjete / p.revenuActuel - 1 : null;
    return {
      id: p.id, nom: p.nom, famille: p.famille, groupe: p.groupe,
      abonnes: p.abonnes, arpu: p.arpu, visites: p.visites, pagesVues: p.pagesVues,
      cleAudience,
      revenuActuel: p.revenuActuel,
      revenuProjete,
      decomposition: { residuel: revResiduel, apporteur: revApporteur, audience: revAudience, ia: revIA },
      partInference, partAudience, partApporteur: partBase,
      delta
    };
  });

  titres.sort((a, b) => (b.abonnes.valeur || 0) - (a.abonnes.valeur || 0));

  const revenuResiduelTotal = partNonMigree * revenuActuelTotal;   // abonnements individuels maintenus
  const revenuTotal = revenuResiduelTotal + revenuBundle + poolIA;
  return {
    kpis: {
      revenuTotal,
      deltaRevenuTotal: revenuActuelTotal > 0 ? revenuTotal / revenuActuelTotal - 1 : null,
      payeurs: payeursBundle,
      deltaPayeurs: payeursActuels > 0 ? payeursBundle / payeursActuels - 1 : null,
      payeursPass: payeursBundle,                              // migrés + nouveaux (sur le pass)
      payeursIndividuel: partNonMigree * payeursActuels,       // non migrés (abonnement individuel)
      payeursTotal: payeursActuels + h.net_new,                // tous les payeurs du système
      deltaPayeursTotal: payeursActuels > 0 ? (payeursActuels + h.net_new) / payeursActuels - 1 : null,
      poolAbonnements: revenuBundle,
      poolIA,
      revenuResiduel: revenuResiduelTotal,
      revenuActuelTotal,
      payeursActuels
    },
    titres
  };
}

// Résout une hypothèse à partir d'un preset + surcharges éventuelles
export function hypothesesDepuisScenario(dataset, nomScenario, surcharges = {}) {
  const hyp = dataset.hypotheses || {};
  const presets = hyp.scenarios || {};
  const base = presets[nomScenario] || presets[hyp.defaut] || {};
  return { ...base, ...surcharges };
}

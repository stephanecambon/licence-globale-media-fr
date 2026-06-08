// Rapport de couverture : pour chaque métrique, combien de valeurs certaines / estimées,
// et reste-t-il le moindre titre sans valeur (« inconnu ») ?
import { loadDataset } from "./load.js";
import { resoudreAbonnes, resoudreArpu, profilTitre } from "../model/model.js";

const d = loadDataset();
const ids = Object.keys(d.titres);

// --- Métriques que le modèle DOIT produire pour chaque titre ---
const comptes = {
  abonnes_num: { certain: 0, estimation: 0, inconnu: 0 },
  arpu:        { ancree: 0, defaut_famille: 0, inconnu: 0 },
  audience:    { certain: 0, estimation: 0, inconnu: 0 },
  indice_inference: { estimation: 0, inconnu: 0 }
};

for (const id of ids) {
  const fam = d.titres[id].famille;
  const ab = resoudreAbonnes(d, id, fam);
  comptes.abonnes_num[ab.couche === "certain" ? "certain" : ab.valeur == null ? "inconnu" : "estimation"]++;

  const p = profilTitre(d, id);
  const arpuAncree = /override|CA|premium|profil/i.test(p.arpu.methode || "") || p.arpu.confiance === "haute" || p.arpu.confiance === "moyenne";
  comptes.arpu[p.arpu.valeur == null ? "inconnu" : arpuAncree ? "ancree" : "defaut_famille"]++;

  comptes.audience[p.visites.couche === "certain" ? "certain" : p.indiceAudienceBase == null || Number.isNaN(p.indiceAudienceBase) ? "inconnu" : "estimation"]++;
  comptes.indice_inference[p.indiceInference == null || Number.isNaN(p.indiceInference) ? "inconnu" : "estimation"]++;
}

const N = ids.length;
console.log(`Périmètre : ${N} titres (hors longue traîne, ajoutée par le modèle).\n`);
console.log("MÉTRIQUES CALCULÉES PAR LE MODÈLE (une valeur garantie par titre)");
console.log(`  abonnes_num      : ${comptes.abonnes_num.certain} certains, ${comptes.abonnes_num.estimation} estimés, ${comptes.abonnes_num.inconnu} inconnus`);
console.log(`  arpu (estimé)    : ${comptes.arpu.ancree} ancrés (override/CA Mediapart), ${comptes.arpu.defaut_famille} défaut famille, ${comptes.arpu.inconnu} inconnus   [aucun prix catalogue : ARPU toujours estimé]`);
console.log(`  audience (visites): ${comptes.audience.certain} certains (ACPM), ${comptes.audience.estimation} estimés, ${comptes.audience.inconnu} inconnus   [temps de lecture réel = Médiamétrie payant ; visites = proxy public]`);
console.log(`  indice_inference : ${comptes.indice_inference.estimation} estimés, ${comptes.indice_inference.inconnu} inconnus   [aucune donnée réelle : inférences non publiées]`);

// --- Données d'entrée certaines (alimentent les estimations ci-dessus) ---
const nb = (m) => Object.keys(d.certain[m].valeurs).length;
console.log("\nDONNÉES D'ENTRÉE CERTAINES (sourcées publiques, alimentent les estimations)");
console.log(`  diffusion_payee  : ${nb("diffusion_payee")} titres   (ancre abonnes_num)`);
console.log(`  visites (ACPM)   : ${nb("visites")} titres   (ancre l'audience)`);
console.log(`  marche           : ${Object.keys(d.marche).length} agrégats`);

const trous = comptes.abonnes_num.inconnu + comptes.arpu.inconnu + comptes.audience.inconnu + comptes.indice_inference.inconnu;
console.log(`\n${trous === 0 ? "\u2713 Chaque titre a UNE valeur (certaine ou estimée) sur chaque métrique — aucune valeur nulle." : "\u2717 " + trous + " valeur(s) nulle(s)."}`);
console.log("\nDONNÉES PUBLIQUES ENCORE MANQUANTES (sourçables mais non chargées) :");
console.log(`  visites ACPM      : ${nb("visites")}/${N} sourcées — tableau complet (230 sites) = export Excel ACPM, à compléter par PR.`);
console.log(`  diffusion ACPM    : ${nb("diffusion_payee")}/${N} sourcées — reste des classements PQR/magazines à compléter par PR.`);
console.log("NON SOURÇABLES PUBLIQUEMENT (resteront estimées) : temps de lecture réel (Médiamétrie payant), inférences IA (non publiées), ARPU (pas de prix catalogue fiable).");

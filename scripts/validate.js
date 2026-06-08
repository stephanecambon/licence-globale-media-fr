// Validateur — exécuté en CI sur chaque PR.
// Règles : intégrité des titre_id, sources existantes, et « aucune valeur certaine ne s'appuie sur une source payante ».
import { loadDataset } from "./load.js";

const d = loadDataset();
const titres = d.titres;
const sources = d.sources;
const erreurs = [];

const sourceOf = (raw, meta) => (typeof raw === "object" && raw.source) || meta.source;

function checkSource(srcId, contexte) {
  if (!srcId) { erreurs.push(`${contexte} : aucune source`); return; }
  const s = sources[srcId];
  if (!s) { erreurs.push(`${contexte} : source inconnue « ${srcId} »`); return; }
  if (s.acces !== "public") {
    erreurs.push(`${contexte} : source « ${srcId} » est ${s.acces} — interdit en couche certaine (republier du payant)`);
  }
}

// Métriques certaines par titre
for (const m of ["abonnes_num", "diffusion_payee", "visites", "pages_vues"]) {
  const f = d.certain[m];
  for (const [id, raw] of Object.entries(f.valeurs)) {
    if (!titres[id]) erreurs.push(`certain/${m} : titre_id inconnu « ${id} »`);
    checkSource(sourceOf(raw, f._meta), `certain/${m}/${id}`);
  }
}

// Marché (sources seulement, pas des titre_id)
for (const [k, v] of Object.entries(d.marche)) {
  checkSource(v.source, `certain/marche/${k}`);
}

// Overrides : titre_id doivent exister
for (const m of Object.keys(d.overrides)) {
  if (m === "_meta") continue;
  for (const id of Object.keys(d.overrides[m])) {
    if (!titres[id]) erreurs.push(`estimation/overrides/${m} : titre_id inconnu « ${id} »`);
  }
}

// Familles référencées par les titres doivent exister dans les paramètres
for (const [id, t] of Object.entries(titres)) {
  if (!d.parametres.familles[t.famille]) {
    erreurs.push(`titres/${id} : famille « ${t.famille} » absente de parametres_modele.familles`);
  }
}

if (erreurs.length) {
  console.error(`\u2717 ${erreurs.length} erreur(s) :`);
  erreurs.forEach((e) => console.error("  - " + e));
  process.exit(1);
} else {
  console.log(`\u2713 Validation OK — ${Object.keys(titres).length} titres, ${Object.keys(sources).length} sources.`);
}

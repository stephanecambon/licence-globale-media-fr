// Build de l'appli statique autonome.
// Assemble le dataset (comme scripts/load.js), injecte le moteur model.js (tel quel,
// sans les mots-clés `export`) et les données dans app/index.src.html → app/index.html.
// Build-free côté navigateur : l'index.html produit est un seul fichier, sans dépendance réseau (hors polices).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadDataset } from "../scripts/load.js";
import { runModel, hypothesesDepuisScenario } from "../model/model.js";

const APP = dirname(fileURLToPath(import.meta.url));
const ROOT = join(APP, "..");
const read = (p) => readFileSync(p, "utf8");

const dataset = loadDataset();
const modelSrc = read(join(ROOT, "model/model.js")).replace(/^export\s+/gm, "");
const tpl = read(join(APP, "index.src.html"));

const out = tpl
  .replace("/*__MODEL__*/", modelSrc)
  .replace("/*__DATA__*/ null", JSON.stringify(dataset));

const DOCS = join(ROOT, "docs");
mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, "index.html"), out);
writeFileSync(join(DOCS, ".nojekyll"), "");   // GitHub Pages : ne pas passer par Jekyll

// Contrôle de parité : ce que l'appli affichera = ce que Node calcule.
const r = runModel(dataset, hypothesesDepuisScenario(dataset, "expansion"));
const M = (n) => (n / 1e6).toFixed(1);
console.log(`docs/index.html écrit (${(out.length / 1024).toFixed(0)} Ko) + docs/.nojekyll.`);
console.log(`Parité (Expansion) : revenu total ${M(r.kpis.revenuTotal)} M€, payeurs ${Math.round(r.kpis.payeurs)}.`);
console.log("Top 3 :", r.titres.filter(t => t.id !== "longue-traine").slice(0, 3)
  .map(t => `${t.nom} ${(t.delta * 100).toFixed(0)}%`).join(" · "));

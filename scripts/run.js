// Démo : charge les données, exécute les 3 scénarios, imprime KPI + top 10 pour l'expansion.
import { loadDataset } from "./load.js";
import { runModel, hypothesesDepuisScenario } from "../model/model.js";

const d = loadDataset();
const eur = (n) => (n / 1e6).toFixed(0) + " M€";
const pct = (x) => (x == null ? "—" : (x >= 0 ? "+" : "") + (x * 100).toFixed(0) + " %");
const couche = (c) => (c === "certain" ? "C" : c === "estimation" ? "≈" : "?");

console.log("=== KPI par scénario (pool abonnés + pool IA) ===\n");
for (const nom of ["cannibalisation", "expansion", "streaming"]) {
  const h = hypothesesDepuisScenario(d, nom);
  const r = runModel(d, h);
  const k = r.kpis;
  console.log(
    nom.padEnd(16) +
    `revenu total ${eur(k.revenuTotal)} (${pct(k.deltaRevenuTotal)})  ` +
    `payeurs ${(k.payeurs / 1e6).toFixed(1)} M (${pct(k.deltaPayeurs)})  ` +
    `abos ${eur(k.poolAbonnements)}  IA ${eur(k.poolIA)}`
  );
}

console.log("\n=== Détail — scénario Expansion (top 10 par abonnés) ===\n");
const r = runModel(d, hypothesesDepuisScenario(d, "expansion"));
console.log("Titre".padEnd(24) + "Abonnés".padStart(11) + "  Actuel".padStart(10) + "  Projeté".padStart(11) + "  Δ".padStart(8));
r.titres.slice(0, 10).forEach((t) => {
  console.log(
    t.nom.padEnd(24) +
    `${couche(t.abonnes.couche)} ${(t.abonnes.valeur || 0).toLocaleString("fr-FR")}`.padStart(11) +
    `  ${eur(t.revenuActuel)}`.padStart(10) +
    `  ${eur(t.revenuProjete)}`.padStart(11) +
    `  ${pct(t.delta)}`.padStart(8)
  );
});

const lt = r.titres.find((t) => t.id === "longue-traine");
if (lt) console.log("\nLongue traîne".padEnd(24) + `≈ ${(lt.abonnes.valeur).toLocaleString("fr-FR")}`.padStart(11) + `  ${eur(lt.revenuActuel)}`.padStart(10) + `  ${eur(lt.revenuProjete)}`.padStart(11) + `  ${pct(lt.delta)}`.padStart(8));

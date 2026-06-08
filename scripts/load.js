// Chargement du dataset depuis les fichiers plats (Node).
// L'appli navigateur fera l'équivalent via fetch().
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

export function loadDataset() {
  return {
    titres: read("data/registre/titres.json").titres,
    sources: read("data/registre/sources.json").sources,
    certain: {
      abonnes_num: read("data/certain/abonnes_num.json"),
      diffusion_payee: read("data/certain/diffusion_payee.json"),
      visites: read("data/certain/visites.json"),
      pages_vues: read("data/certain/pages_vues.json")
    },
    marche: read("data/certain/marche.json").valeurs,
    parametres: read("data/estimation/parametres_modele.json"),
    overrides: read("data/estimation/overrides.json"),
    hypotheses: read("data/hypothese/hypotheses.json")
  };
}

export { ROOT };

// Catalogue du site, lu dans Nexudus : horaires, salles, postes, tarifs, services, formules et coordonnées.
//   GET /api/catalogue → les pages s'en servent pour afficher noms, prix, capacités et équipements à jour.
import { json, vide } from "../lib/nexudus.mjs";
import { catalogue } from "../lib/catalogue.mjs";

export default async (req) => {
  if (req.method !== "GET") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  try { return json(200, { ok: true, ...(await catalogue()) }); }
  catch (e) { console.error(e.message); return json(502, { ok: false, erreur: "Impossible de lire le catalogue pour le moment." }); }
};

export const config = { path: "/api/catalogue" };

// Diagnostic : vérifie que le site peut appeler Nexudus (renvoie seulement des codes, aucun identifiant).
import { nx, vide, json, CFG } from "../lib/nexudus.mjs";

export const config = { path: "/api/etat" };

export default async () => {
  const u = process.env.NEXUDUS_USER || "";
  const res = { identifiants: !vide(), utilisateur: u ? u.replace(/^(.{2}).*(@.*)$/, "$1…$2") : null, motDePasse: (process.env.NEXUDUS_PASSWORD || "").length };
  for (const [nom, chemin] of [["entreprise", `/sys/businesses/${CFG.business}`], ["contacts", `/spaces/coworkers?size=1`], ["crm", `/crm/crmopportunities?size=1`]]) {
    try { await nx("GET", chemin); res[nom] = "ok"; }
    catch (e) { res[nom] = String(e.message).slice(0, 160); }
  }
  return json(200, res);
};

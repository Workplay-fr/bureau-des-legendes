// Diagnostic : vérifie que le site peut appeler Nexudus (renvoie seulement des codes, aucun identifiant).
import { nx, vide, json, CFG } from "../lib/nexudus.mjs";

export const config = { path: "/api/etat" };

export default async () => {
  const u = process.env.NEXUDUS_USER || "";
  const res = { identifiants: !vide(), utilisateur: u ? u.replace(/^(.{2}).*(@.*)$/, "$1…$2") : null, motDePasse: (process.env.NEXUDUS_PASSWORD || "").length };
  for (const [nom, chemin] of [["entreprise", `/sys/businesses/${CFG.business}`], ["contacts", `/spaces/coworkers?size=1`], ["crm", `/crm/crmopportunities?size=1`], ["reservations", `/spaces/bookings?size=1`], ["contrats", `/billing/coworkercontracts?size=1`], ["tarifs", `/billing/tariffs?size=1`]]) {
    try { await nx("GET", chemin); res[nom] = "ok"; }
    catch (e) { res[nom] = String(e.message).slice(0, 160); }
  }
  // Diagnostic du plan d'étage : éléments du plan, sans aucune donnée personnelle (occupé oui/non seulement).
  try {
    const tout = [];
    for (let page = 1; page <= 3; page++) { const d = await nx("GET", `/sys/floorplandesks?FloorPlanDesk_FloorPlan_Business=${CFG.business}&size=100&page=${page}`); tout.push(...(d.Records || [])); if (!d.HasNextPage) break; }
    res.plan = tout.filter(x => Number(x.FloorPlanBusinessId) === CFG.business && !/^archive/i.test(x.FloorPlanName || ""))
      .map(x => [x.Id, x.FloorPlanName, x.Name, "type " + x.ItemType, "cap " + x.Capacity, "prix " + x.Price, "m2 " + (x.Area ?? x.Size), x.Available ? "dispo" : "indispo", x.CoworkerId || x.CoworkerContractIds ? "occupé" : "libre", x.ResourceId ? "ressource" : "", x.DefaultTariffName || "", String(x.AvailableFromTime || "").slice(0, 10)].join(" | "));
  } catch (e) { res.plan = String(e.message).slice(0, 160); }
  return json(200, res);
};

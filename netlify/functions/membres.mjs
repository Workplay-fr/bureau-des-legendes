// Adhésion depuis le site : crée (ou retrouve) la fiche client avec son compte portail,
// puis le contrat de la formule choisie dans Nexudus. Le paiement affiché est une simulation.
import { CFG, FORMULES_NX, nx, contact, nettoie, emailValide, json, tropDEnvois, vide } from "../lib/nexudus.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.site_web) return json(200, { ok: true });
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 5000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant de valider." });
  if (tropDEnvois(req, 3)) return json(429, { ok: false, erreur: "Trop d'adhésions envoyées. Réessayez dans quelques minutes." });

  const tarif = Number(d.formule), f = FORMULES_NX[tarif];
  const prenom = nettoie(d.prenom, 60), nomF = nettoie(d.nom, 60);
  const v = { nom: `${prenom} ${nomF}`.trim(), email: nettoie(d.email, 160).toLowerCase(), tel: nettoie(d.tel, 40), societe: nettoie(d.societe, 120) };
  const quantite = f && f.quantite ? Math.max(1, Math.min(6, Number(d.quantite) || 1)) : 1;
  const debut = /^\d{4}-\d{2}-\d{2}$/.test(d.debut || "") ? d.debut : null;
  if (!f) return json(400, { ok: false, erreur: "Choisissez une formule." });
  if (!prenom || !nomF) return json(400, { ok: false, erreur: "Indiquez votre prénom et votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  const t = debut && new Date(debut + "T12:00:00Z");
  if (!t || t < new Date(Date.now() - 864e5) || t > new Date(Date.now() + 120 * 864e5)) return json(400, { ok: false, erreur: "Choisissez une date de début." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter les conditions d'adhésion." });

  try {
    const c = await contact({ ...v, compte: true, note: `Membre inscrit depuis le site vitrine (formule ${f.nom}).` });
    const k = await nx("POST", "/billing/coworkercontracts", {
      IssuedById: CFG.business, CoworkerId: c.id, TariffId: tarif, StartDate: `${debut}T00:00:00Z`,
      BillingDay: Math.min(28, t.getUTCDate()), Quantity: quantite, ApplyProRating: true,
      Notes: `Souscription depuis le site vitrine · paiement simulé (démo) de ${f.prix * quantite} € HT pour le premier mois${v.societe ? " · Société : " + v.societe : ""}`,
    });
    const id = k.Value && k.Value.Id;
    return json(200, { ok: true, contrat: id, reference: id ? "BDL-M" + String(id).slice(-5) : null, nouveau: c.nouveau, compte: c.compte });
  } catch (e) {
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "L'adhésion n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34." });
  }
};

export const config = { path: "/api/membres" };

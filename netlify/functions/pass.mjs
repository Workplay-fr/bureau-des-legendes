// Achat d'un pass journée (ou d'un carnet de 10) depuis le site : crée (ou retrouve) le contact, puis le ou les pass dans Nexudus.
//   POST /api/pass  { type: "unite" | "carnet", prenom, nom, email, accord }
// Le paiement affiché sur le site est une simulation : aucune donnée bancaire n'est reçue ici.
import { CFG, PASS_NX, nx, contact, nettoie, emailValide, json, tropDEnvois, vide, bilingue, emailRefuse } from "../lib/nexudus.mjs";
import { synchro } from "../lib/catalogue.mjs";

const traiter = async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  await synchro();
  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.site_web) return json(200, { ok: true });
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 4000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant de valider." });
  if (tropDEnvois(req, 4)) return json(429, { ok: false, erreur: "Trop de demandes envoyées. Réessayez dans quelques minutes." });

  const p = PASS_NX[d.type];
  const prenom = nettoie(d.prenom, 60), nomF = nettoie(d.nom, 60);
  const v = { nom: `${prenom} ${nomF}`.trim(), email: nettoie(d.email, 160).toLowerCase(), tel: "", societe: "" };
  if (!p) return json(400, { ok: false, erreur: "Choisissez un pass." });
  if (!prenom || !nomF) return json(400, { ok: false, erreur: "Indiquez votre prénom et votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter les conditions de vente." });

  try {
    const c = await contact({ ...v, note: `Contact créé depuis le site vitrine (achat : ${p.nom}).` });
    const montant = p.prix * p.quantite;
    const corps = { CoworkerId: c.id, BusinessId: CFG.business, TimePassId: p.id, Price: p.prix, Notes: `Acheté depuis le site vitrine · paiement de démonstration de ${montant} € HT` };
    // Un enregistrement par journée : Nexudus décompte ainsi chaque passage à l'accueil.
    let premier = null;
    for (let i = 0; i < p.quantite; i++) { const r = await nx("POST", "/billing/coworkertimepasses", corps); premier = premier || (r.Value && r.Value.Id); }
    return json(200, { ok: true, montantHt: montant, quantite: p.quantite, reference: premier ? "BDL-P" + String(premier).slice(-5) : null, nouveau: c.nouveau });
  } catch (e) {
    const refus = emailRefuse(e); if (refus) return refus;
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "L'achat n'a pas pu être enregistré. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/pass" };

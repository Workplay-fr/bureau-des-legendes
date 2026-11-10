// Reçoit le formulaire « Réserver une visite » et l'enregistre dans le CRM Nexudus :
// un contact (retrouvé ou créé) et une opportunité dans « Sales Pipeline · Demande de visite en ligne ».
// Accès Nexudus : variables d'environnement Netlify NEXUDUS_USER et NEXUDUS_PASSWORD.
import { CFG, nx, contact, nettoie, emailValide, json, tropDEnvois, vide, isoZ } from "../lib/nexudus.mjs";

const FORMULES = { "Nomade": 290, "Résident": 490, "Bureau privé": 750, "Domiciliation": 90, "À définir": null };
const EQUIPES = ["Seul·e", "2 à 5 personnes", "6 personnes et plus"];

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }

  // Anti-spam : champ piège invisible, formulaire rempli trop vite, trop d'envois.
  if (d.site_web) return json(200, { ok: true });
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 3000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant d'envoyer." });
  if (tropDEnvois(req)) return json(429, { ok: false, erreur: "Trop de demandes envoyées. Réessayez dans quelques minutes." });

  const v = {
    nom: nettoie(d.nom, 120), email: nettoie(d.email, 160).toLowerCase(), tel: nettoie(d.tel, 40), societe: nettoie(d.societe, 120),
    message: nettoie(d.message, 1500), formule: Object.hasOwn(FORMULES, d.formule) ? d.formule : "À définir",
    equipe: EQUIPES.includes(d.equipe) ? d.equipe : EQUIPES[0], quand: new Date(d.quand), quandTxt: nettoie(d.quandTxt, 80),
  };
  if (v.nom.length < 2) return json(400, { ok: false, erreur: "Indiquez votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  if (isNaN(v.quand) || v.quand < Date.now() - 864e5 || v.quand > Date.now() + 90 * 864e5) return json(400, { ok: false, erreur: "Choisissez une date de visite." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter d'être recontacté." });

  try {
    const c = await contact({ ...v, note: "Contact créé depuis le site vitrine (demande de visite)." });
    const notes = [`Visite souhaitée : ${v.quandTxt}`, `Intérêt : ${v.formule}`, `Équipe : ${v.equipe}`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`, v.message && `Message : ${v.message}`].filter(Boolean).join("\n");
    await nx("POST", "/crm/crmopportunities", {
      Name: `Visite · ${v.nom}`, CrmBoardColumnId: CFG.colonne, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1,
      DueDate: isoZ(v.quand), Value: FORMULES[v.formule], Notes: notes,
      UtmSource: nettoie(d.utm_source, 80) || "site-vitrine", UtmMedium: nettoie(d.utm_medium, 80) || "formulaire-visite", UtmCampaign: nettoie(d.utm_campaign, 80) || null,
    });
    return json(200, { ok: true, nouveau: c.nouveau });
  } catch (e) {
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "Votre demande n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") });
  }
};

export const config = { path: "/api/visite" };

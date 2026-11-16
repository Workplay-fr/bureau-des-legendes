// Reçoit le formulaire « Réserver une visite » et l'enregistre dans le CRM Nexudus :
// un contact (retrouvé ou créé) et une opportunité dans « Sales Pipeline · Demande de visite en ligne ».
// Accès Nexudus : variables d'environnement Netlify NEXUDUS_USER et NEXUDUS_PASSWORD.
import { CFG, nx, contact, nettoie, emailValide, json, tropDEnvois, vide, isoZ, bilingue } from "../lib/nexudus.mjs";

const FORMULES = { "Nomade": 290, "Résident": 490, "Bureau privé": 750, "Domiciliation": 90, "À définir": null };
const RESPONSABLE = 1417540719; // Matthias Cohen-Hadria (administrateur Flow)
const EQUIPES =["Seul·e", "2 à 5 personnes", "6 personnes et plus"];

const traiter = async (req) => {
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
    // Carte en tête de colonne, au nom de l'équipe, datée de la visite. La colonne porte la liste de tâches
    // « Demande de visite » : Nexudus crée la tâche « confirmer la visite » (2 h) et notifie le responsable dans Flow.
    const quandCourt = v.quand.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    await nx("POST", "/crm/crmopportunities", {
      Name: `Visite · ${v.nom} · ${quandCourt}`.slice(0, 120), CrmBoardColumnId: CFG.colonne, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1,
      ResponsibleId: RESPONSABLE, DueDate: isoZ(v.quand), Value: FORMULES[v.formule], Notes: notes,
      UtmSource: nettoie(d.utm_source, 80) || "site-vitrine", UtmMedium: nettoie(d.utm_medium, 80) || "formulaire-visite", UtmCampaign: nettoie(d.utm_campaign, 80) || null,
    });
    // Tâches calées sur la date de la visite (la liste de tâches ne sait compter qu'à partir de la création).
    const veille = new Date(v.quand.getTime() - 864e5), lendemain = new Date(v.quand.getTime() + 864e5);
    for (const [nom, due] of [[`Visite · préparer l'accueil de ${v.nom} (badge visiteur, café, espaces à montrer)`, veille > new Date() ? veille : v.quand],
                              [`Visite · relancer ${v.nom} après la visite (proposition de formule)`, lendemain]]) {
      await nx("POST", "/spaces/coworkertasks", { BusinessId: CFG.business, CoworkerId: c.id, Name: nom.slice(0, 200), DueDate: isoZ(due),
        ResponsibleId: RESPONSABLE, NotifyByEmail: true, DisplayToEveryone: true, Completed: false, Notes: `Visite prévue : ${v.quandTxt || quandCourt}` })
        .catch(e => console.error("Tâche non créée :", e.message));
    }
    return json(200, { ok: true, nouveau: c.nouveau });
  } catch (e) {
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "Votre demande n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/visite" };

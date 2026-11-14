// Adhésion depuis le site : crée (ou retrouve) la fiche client avec son compte portail,
// puis le contrat de la formule choisie dans Nexudus. Le paiement affiché est une simulation.
import { CFG, FORMULES_NX, nx, contact, nettoie, emailValide, json, tropDEnvois, vide, bilingue, emailRefuse } from "../lib/nexudus.mjs";
import { synchro } from "../lib/catalogue.mjs";

const traiter = async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  await synchro(); // noms, prix et horaires relus dans Nexudus (au plus toutes les 60 s)
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
  // Domiciliation : un dossier (société, SIREN, dirigeant) ; le contrat reste en attente des vérifications, rien n'est encaissé avant.
  // Les membres (Nomade, Résident, Bureau privé) peuvent prendre la domiciliation en option : second contrat « Domiciliation membre ».
  const DOMIC = 1415397040, DOMIC_MEMBRE = 1415468540, BUREAU_PRIVE = 1415397447;
  const domic = tarif === DOMIC, option = !domic && !!d.option_domiciliation;
  const siren = String(d.siren || "").replace(/\s/g, ""), creation = !!d.creation;
  const societeDom = domic ? v.societe : nettoie(d.dom_societe || v.societe, 120);
  if ((domic || option) && societeDom.length < 2) return json(400, { ok: false, erreur: "Indiquez la dénomination de la société." });
  if ((domic || option) && !creation && !/^\d{9}$/.test(siren)) return json(400, { ok: false, erreur: "Le SIREN compte 9 chiffres." });
  const notesDom = `Dossier site · ${societeDom.slice(0, 60)} · SIREN ${creation ? "en création" : siren} · paiement après vérifications`;
  const notesContrat = domic ? notesDom : `Adhésion site · paiement simulé (démo) de ${f.prix * quantite} € HT${v.societe ? " · " + v.societe.slice(0, 60) : ""}`;
  const contrat = (tariffId, notes, extra) => nx("POST", "/billing/coworkercontracts", {
    IssuedById: CFG.business, CoworkerId: cId, TariffId: tariffId, StartDate: `${debut}T00:00:00Z`,
    BillingDay: Math.min(28, t.getUTCDate()), Quantity: tariffId === tarif ? quantite : 1, ApplyProRating: true, Notes: notes, ...(extra || {}),
  });
  const carte = (colonne, nom, valeur, notes, medium) => nx("POST", "/crm/crmopportunities", {
    Name: nom.slice(0, 120), CrmBoardColumnId: colonne, CoworkerId: cId, Status: 1, Position: 0, LeadSource: 1,
    DueDate: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 19) + "Z", Value: valeur, Notes: notes.filter(Boolean).join("\n"),
    UtmSource: "site-vitrine", UtmMedium: medium,
  }).catch(e => console.error("Carte CRM non créée :", e.message));
  let cId = null;

  try {
    const c = await contact({ ...v, compte: true,
      note: domic ? `Dirigeant de ${societeDom} : dossier de domiciliation déposé depuis le site vitrine${creation ? " (société en création)" : ` (SIREN ${siren})`}.`
        : `Membre inscrit depuis le site vitrine (formule ${f.nom}${option ? ", option domiciliation" : ""}).`,
      extra: (domic || option) ? { BillingName: societeDom, CompanyName: societeDom, TaxIDNumber: creation ? null : siren } : null });
    cId = c.id;
    let k;
    try { k = await contrat(tarif, notesContrat); }
    catch (e) {
      // Filet de sécurité : si le module Bureaux virtuels venait à être désactivé, le contrat de domiciliation ne peut pas être créé par l'API.
      if (!/virtual office/i.test(String(e.message))) throw e;
      const o = await nx("POST", "/crm/crmopportunities", {
        Name: `${f.nom} · ${v.nom}`, CrmBoardColumnId: CFG.colonne, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1,
        DueDate: `${debut}T09:00:00Z`, Value: f.prix * quantite,
        Notes: [`Demande de ${f.nom} depuis le site vitrine`, `Début souhaité : ${debut}`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join("\n"),
        UtmSource: "site-vitrine", UtmMedium: "adhesion",
      });
      const oid = o.Value && o.Value.Id;
      return json(200, { ok: true, contrat: null, demande: true, reference: oid ? "BDL-D" + String(oid).slice(-5) : null, nouveau: c.nouveau, compte: c.compte });
    }
    const id = k.Value && k.Value.Id;
    const infosDom = [`Société : ${societeDom}${creation ? " (en création)" : ` · SIREN ${siren}`}`, `Dirigeant : ${v.nom}`, `Début souhaité : ${debut}`, `Paiement après validation des vérifications`];
    let optionId = null;
    if (domic && id) {
      // Tableau « Domiciliation », colonne « Dossier reçu » : Nexudus crée les tâches de l'équipe. Les vérifications sont ouvertes
      // par le client dans l'onboarding Bureau virtuel du portail, dont Nexudus envoie le lien par e-mail.
      await carte(1415384205, `Domiciliation · ${societeDom}`, f.prix * 3, ["Dossier de domiciliation déposé depuis le site vitrine", ...infosDom], "domiciliation");
    } else if (id) {
      // Tableau « Adhésions », colonne « Inscription reçue » : tâches d'accueil (badge, paiement, premier jour, suivi à J+7).
      await carte(1415384309, `${f.nom} · ${v.nom}${v.societe ? " · " + v.societe : ""}`, f.prix * quantite * 12,
        [`Adhésion ${f.nom}${quantite > 1 ? ` · ${quantite} postes` : ""} depuis le site vitrine`, `Début : ${debut}`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`, option && "Option domiciliation demandée (voir le tableau Domiciliation)"], "adhesion");
      if (option) {
        try {
          const ko = await contrat(DOMIC_MEMBRE, notesDom, tarif === BUREAU_PRIVE ? { Price: 0 } : null);
          optionId = ko.Value && ko.Value.Id;
          await carte(1415384205, `Domiciliation (option ${f.nom}) · ${societeDom}`, (tarif === BUREAU_PRIVE ? 0 : 45) * 3,
            [`Option domiciliation prise avec l'adhésion ${f.nom}`, ...infosDom], "domiciliation-option");
        } catch (e) { console.error("Option domiciliation non créée :", e.message); }
      }
    }
    return json(200, { ok: true, contrat: id, option: optionId, reference: id ? (domic ? "BDL-D" : "BDL-M") + String(id).slice(-5) : null, nouveau: c.nouveau, compte: c.compte });
  } catch (e) {
    const refus = emailRefuse(e); if (refus) return refus;
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "L'adhésion n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/membres" };

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
  // Domiciliation : un dossier (société, SIREN, dirigeant) ; le contrat reste en attente des vérifications KYC/KYB, rien n'est encaissé avant.
  const domic = tarif === 1415397040;
  const siren = String(d.siren || "").replace(/\s/g, ""), creation = !!d.creation;
  if (domic && v.societe.length < 2) return json(400, { ok: false, erreur: "Indiquez la dénomination de la société." });
  if (domic && !creation && !/^\d{9}$/.test(siren)) return json(400, { ok: false, erreur: "Le SIREN compte 9 chiffres." });
  const notesContrat = domic
    ? ["Dossier de domiciliation déposé depuis le site vitrine", `Société domiciliée : ${v.societe}`, creation ? "SIREN : société en cours de création" : `SIREN : ${siren}`, `Dirigeant : ${v.nom}`, "Aucun paiement avant la validation des vérifications (identité, justificatif de domicile, Pappers, OpenSanctions)"].join(" · ")
    : `Souscription depuis le site vitrine · paiement simulé (démo) de ${f.prix * quantite} € HT pour le premier mois${v.societe ? " · Société : " + v.societe : ""}`;

  try {
    const c = await contact({ ...v, compte: true,
      note: domic ? `Dirigeant de ${v.societe} : dossier de domiciliation déposé depuis le site vitrine${creation ? " (société en création)" : ` (SIREN ${siren})`}.` : `Membre inscrit depuis le site vitrine (formule ${f.nom}).`,
      extra: domic ? { BillingName: v.societe, ReferenceNumber: creation ? null : siren } : null });
    let k;
    try { k = await nx("POST", "/billing/coworkercontracts", {
      IssuedById: CFG.business, CoworkerId: c.id, TariffId: tarif, StartDate: `${debut}T00:00:00Z`,
      BillingDay: Math.min(28, t.getUTCDate()), Quantity: quantite, ApplyProRating: true,
      Notes: notesContrat,
    }); }
    catch (e) {
      // Filet de sécurité : si le module Bureaux virtuels venait à être désactivé, le contrat de domiciliation ne peut pas être créé par l'API.
      // On enregistre alors une demande dans le pipeline commercial, à traiter par l'équipe (vérification d'identité comprise).
      if (!/virtual office/i.test(String(e.message))) throw e;
      const o = await nx("POST", "/crm/crmopportunities", {
        Name: `${f.nom} · ${v.nom}`, CrmBoardColumnId: CFG.colonne, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1,
        DueDate: `${debut}T09:00:00Z`, Value: f.prix * quantite,
        Notes: [`Demande de ${f.nom} depuis le site vitrine`, `Début souhaité : ${debut}`, `Paiement simulé (démo) de ${f.prix * quantite} € HT pour le premier mois`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join("\n"),
        UtmSource: "site-vitrine", UtmMedium: "adhesion",
      });
      const oid = o.Value && o.Value.Id;
      return json(200, { ok: true, contrat: null, demande: true, reference: oid ? "BDL-D" + String(oid).slice(-5) : null, nouveau: c.nouveau, compte: c.compte });
    }
    const id = k.Value && k.Value.Id;
    // Domiciliation : on ouvre tout de suite les deux vérifications rattachées au contrat (pièce d'identité via Stripe Identity,
    // justificatif de domicile relu par l'équipe). Le client les retrouve dans son espace membre ; le contrat s'active quand elles sont validées.
    if (domic && id) {
      try {
        let guid = k.Value.UniqueId;
        if (!guid) { const kk = await nx("GET", `/billing/coworkercontracts/${id}`); guid = kk.UniqueId; }
        const verif = (type, nom, desc, prov) => ({ BusinessId: CFG.business, CoworkerId: c.id, Name: nom, Description: desc,
          IdentityCheckProvider: prov, VerificationType: type, IdentityDocumentType: 3, AddressDocumentType: 99,
          IdentityCheckDocumentTypes: [1, 3], AddressCheckDocumentTypes: [9, 4, 99], CoworkerContractGuid: guid });
        const corps = [verif(1, "Domiciliation · pièce d'identité du dirigeant", "Carte nationale d'identité ou passeport en cours de validité.", 2),
          verif(2, "Domiciliation · justificatif de domicile du dirigeant", "Justificatif de domicile personnel de moins de 3 mois.", 1)];
        for (const b of corps) {
          try { await nx("POST", "/spaces/coworkeridentitychecks", b); }
          catch (e) { await nx("POST", "/billing/coworkeridentitychecks", b); }
        }
      } catch (e) { console.error("Vérifications non créées :", e.message); }
    }
    return json(200, { ok: true, contrat: id, reference: id ? (domic ? "BDL-D" : "BDL-M") + String(id).slice(-5) : null, nouveau: c.nouveau, compte: c.compte });
  } catch (e) {
    const refus = emailRefuse(e); if (refus) return refus;
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "L'adhésion n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/membres" };

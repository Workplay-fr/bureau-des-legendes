// Agent IA du site (« L’agent des Légendes ») : répond aux questions, propose les espaces réellement libres et prépare un devis Nexudus.
// Les données viennent toutes de Nexudus (catalogue relu toutes les 60 s). Le modèle ne peut proposer que ce que renvoient les outils :
// aucun prix, aucune remise, aucun espace inventé. Le devis est créé en brouillon : l'équipe le relit et l'envoie depuis Flow.
import { CFG, nx, contact, nettoie, emailValide, FORMULES_NX } from "./nexudus.mjs";
import { synchro, catalogue } from "./catalogue.mjs";

const RESPONSABLE = 1417540719;              // Matthias Cohen-Hadria (administrateur Flow)
const COLONNE_DEVIS = 1415385821;            // Adhésions en ligne · Devis à envoyer (tâches : relire et envoyer, relancer à J+3)
const NOMADE = 1415397038, RESIDENT = 1415397039, BUREAU_PRIVE = 1415397447, DOMIC_MEMBRE = 1415468540;
const MODELE = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const eur = n => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
const premierDuMoisSuivant = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10); };
const dateValide = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s + "T12:00:00Z"));

// ---- Données transmises au modèle (vue compacte du catalogue Nexudus) ----
async function contexte(lang) {
  const c = await catalogue();
  const jours = lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  return {
    lieu: { nom: "Bureau des Légendes", adresse: "312, boulevard Haussmann, 75009 Paris", ...(c.lieu?.telephone ? { telephone: c.lieu.telephone } : {}) },
    horaires: Object.entries(c.horaires || {}).map(([j, h]) => `${jours[j]} ${h ? `${h[0]}h–${h[1]}h` : (lang === "en" ? "closed" : "fermé")}`).join(", "),
    formules: c.formules.map(f => ({ nom: f.nom, prix_mensuel_ht: f.prix, description: f.description.slice(0, 260) })),
    salles_de_reunion: c.salles.filter(s => s.visible).map(s => ({ nom: s.nom, places: s.places, prix_heure_ht: s.prixHeure, equipements: s.equipements.slice(0, 6) })),
    postes_flexibles: { demi_journee_ht: c.tarifsPoste.matin, journee_ht: c.tarifsPoste.journee, nombre: c.postes.length },
    pass: Object.values(c.pass).map(p => ({ nom: p.nom, prix_ht: p.total })),
    services_avec_salle: c.produits.map(p => ({ nom: p.nom, prix_ht: p.prix, par_personne: p.parPersonne })),
    evenements: c.evenements.map(e => ({ nom: e.nom, debut: e.debut, lieu: e.lieu, resume: e.resume.slice(0, 140) })),
    bureaux_prives: c.bureaux.map(b => ({ nom: b.nom, etage: b.etage, capacite: b.capacite, surface_m2: b.surface, prix_mensuel_ht: b.prix, libre: b.libre })),
    postes_attitres_libres: c.postesAttitres?.libres ?? null,
  };
}

function consignes(lang, donnees, etat) {
  const fr = lang !== "en";
  return `Tu es « L'agent des Légendes » (en anglais : « the Legends' agent »), l'agent du Bureau des Légendes qui renseigne et conseille les visiteurs jusqu'au devis, un lieu de travail haut de gamme au 312, boulevard Haussmann (Paris 9e), installé dans un immeuble haussmannien. Tu réponds sur le site web à des visiteurs : indépendants, dirigeants, équipes qui cherchent un bureau.

Langue : ${fr ? "français, vouvoiement" : "English"}. Ton : sobre, chaleureux, précis, jamais commercial ni familier. Réponses courtes : 1 à 3 phrases, sans titres. **Gras** avec parcimonie. Pas d'emoji.

Règles absolues :
- Tu n'affirmes que ce qui figure dans les DONNÉES ci-dessous ou dans les résultats d'outils. Si une information manque (parking, animaux, accès PMR, etc.), dis-le simplement et propose une visite.
- Prix en euros HT. Aucune remise, aucun geste commercial. Ne demande jamais de moyen de paiement.
- Tu ne commentes jamais ta façon de travailler : pas de « j'ai vérifié », « je viens de relancer la recherche », « je l'avais affirmé plus tôt », « je n'ai pas encore créé le devis ». Tu vérifies en silence et tu donnes la réponse.
- Tu ne dis jamais que tu as ouvert un formulaire ou une page : tu appelles ouvrir_formulaire, et le site l'indique lui-même au visiteur.
- Tu ne poses jamais deux fois la même question. Si le visiteur a déjà répondu (voir l'historique et l'ÉTAT), tu t'en sers.
- Une fois l'offre choisie, tu ne proposes plus d'autres offres, sauf si le visiteur le demande.
- Quand le visiteur choisit une offre (message « Je choisis l'offre… »), réponds en une phrase. Si tu viens déjà de demander ses coordonnées, ne les redemande pas : dis simplement que tu attends ces informations.
- Quand tu appelles un outil, écris ta réponse complète dans le même message : pas de phrase qui suppose un contexte invisible (« vous pouvez y choisir… »).

Parcours « devis » (bureau privé, postes attitrés ou formule Nomade, tous mensuels) :
1. Si besoin, demande en une seule question le nombre de personnes et la date d'arrivée (par défaut le ${premierDuMoisSuivant()}).
2. Appelle chercher_espaces. Le site affiche les offres en cartes : présente-les en une phrase, sans recopier les chiffres. Ne rappelle pas chercher_espaces tant que le nombre de personnes ou la date ne changent pas.
3. Une fois l'offre choisie, demande en un seul message : prénom, nom, e-mail professionnel, société (téléphone facultatif), et s'il souhaite la domiciliation de la société.
4. Dès que tu as prénom, nom, e-mail et société, appelle preparer_devis. Le site affiche alors un récapitulatif avec un bouton « Confirmer le devis » et une case pour la domiciliation. Dis seulement, en une phrase, de vérifier puis de confirmer. Si le visiteur demande une modification, rappelle preparer_devis.
5. Tu ne crées jamais le devis toi-même : c'est le bouton de confirmation qui le fait.

Besoin ponctuel (une journée, une demi-journée, quelques jours) : il n'y a pas de devis, mais ne réponds jamais par un simple refus. Oriente : réservation d'un poste à la journée (ouvrir_formulaire "poste"), Pass journée ou carnet de 10 passes (ouvrir_formulaire "pass"), salle à l'heure (ouvrir_formulaire "salle"). Visite : ouvrir_formulaire "visite".

DONNÉES (lues dans Nexudus à l'instant) :
${JSON.stringify(donnees)}

ÉTAT DE LA CONVERSATION (tenu par le site, fiable) :
${JSON.stringify(etat)}`;
}

// ---- Outils ----
const OUTILS = [
  { name: "chercher_espaces", description: "Liste les offres mensuelles réellement disponibles pour un nombre de personnes et une date d'arrivée : bureaux privés libres, postes attitrés, formule Nomade. Le site les affiche en cartes.",
    input_schema: { type: "object", properties: { personnes: { type: "integer", minimum: 1, maximum: 40 }, date_arrivee: { type: "string", description: "AAAA-MM-JJ" }, budget_mensuel_ht: { type: "number" } }, required: ["personnes"] } },
  { name: "preparer_devis", description: "Prépare le récapitulatif du devis pour l'offre choisie. Le site l'affiche avec un bouton « Confirmer le devis » ; c'est ce bouton qui crée le devis.",
    input_schema: { type: "object", properties: { option_id: { type: "string" }, prenom: { type: "string" }, nom: { type: "string" }, email: { type: "string" }, societe: { type: "string" }, telephone: { type: "string" }, domiciliation: { type: "boolean" }, resume_besoin: { type: "string", description: "Résumé en une ou deux phrases du besoin exprimé, pour l'équipe." } },
      required: ["option_id", "prenom", "nom", "email", "societe"] } },
  { name: "ouvrir_formulaire", description: "Ouvre sur la page la bonne section : visite du lieu, réservation de salle, réservation de poste à la journée, achat de Pass journée ou de carnet.",
    input_schema: { type: "object", properties: { quoi: { type: "string", enum: ["visite", "salle", "poste", "pass"] } }, required: ["quoi"] } },
];

// Options calculées côté serveur à partir de Nexudus (le modèle ne fait que les désigner).
async function options({ personnes, date_arrivee, budget_mensuel_ht }) {
  const etat = await synchro(); const c = await catalogue();
  const n = Math.max(1, Math.min(40, Number(personnes) || 1));
  const date = dateValide(date_arrivee) ? date_arrivee : premierDuMoisSuivant();
  const f = id => c.formules.find(x => x.id === id) || { nom: FORMULES_NX[id]?.nom, prix: FORMULES_NX[id]?.prix };
  const res = [];
  const prixPoste = f(BUREAU_PRIVE).prix;
  for (const b of (etat.bureaux || []).filter(b => b.libre && (b.capacite || 0) >= n && (b.capacite || 0) <= Math.max(n * 2, n + 3)).sort((a, b) => a.capacite - b.capacite)) {
    const q = b.capacite || n;
    res.push({ id: `bureau-${b.id}`, type: "bureau", titre: b.nom, detail: `${b.etage} · ${b.capacite} postes${b.surface ? ` · ${b.surface} m²` : ""}`, tarif: BUREAU_PRIVE, unite: b.id, quantite: q, prix_unitaire: prixPoste, total_mensuel_ht: prixPoste * q, date });
  }
  const pa = etat.postesAttitres || {};
  if ((pa.libres || 0) >= n && n <= 8) { const r = f(RESIDENT); res.push({ id: `resident-${n}`, type: "resident", titre: `${n} poste${n > 1 ? "s" : ""} attitré${n > 1 ? "s" : ""} · ${r.nom}`, detail: "2e étage · votre poste, tous les jours", tarif: RESIDENT, unites: (pa.idsLibres || []).slice(0, n), quantite: n, prix_unitaire: r.prix, total_mensuel_ht: r.prix * n, date }); }
  if (n <= 6) { const r = f(NOMADE); res.push({ id: `nomade-${n}`, type: "nomade", titre: `${n} × ${r.nom}`, detail: "Accès au plateau partagé, sans poste fixe", tarif: NOMADE, quantite: n, prix_unitaire: r.prix, total_mensuel_ht: r.prix * n, date }); }
  const budget = Number(budget_mensuel_ht) || 0;
  res.sort((a, b) => (budget ? Math.abs(a.total_mensuel_ht - budget) - Math.abs(b.total_mensuel_ht - budget) : 0));
  return { personnes: n, date_arrivee: date, options: res.slice(0, 3), aucune_offre_bureau: !res.some(o => o.type === "bureau") };
}

const prixDom = o => (o.type === "bureau" ? 0 : 45);
const ref = () => "BDL-" + Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

// Récapitulatif (étape avant confirmation) : contrôle les champs et garde le tout dans la mémoire de conversation.
async function preparerDevis(entree, memo) {
  if (!memo.criteres) return { ok: false, erreur: "Appelez d'abord chercher_espaces." };
  const o = (await options(memo.criteres)).options.find(x => x.id === entree.option_id);
  if (!o) return { ok: false, erreur: "Cette offre n'est plus disponible : relancez chercher_espaces." };
  const email = nettoie(entree.email, 160).toLowerCase(), prenom = nettoie(entree.prenom, 60), nom = nettoie(entree.nom, 60), societe = nettoie(entree.societe, 120);
  if (!emailValide(email) || /[^\x00-\x7F]/.test(email)) return { ok: false, erreur: "Adresse e-mail invalide : redemandez-la." };
  if (!prenom || !nom || societe.length < 2) return { ok: false, erreur: "Prénom, nom et société sont nécessaires." };
  memo.choix = o.id;
  memo.recap = { option_id: o.id, prenom, nom, email, societe, telephone: nettoie(entree.telephone, 40), domiciliation: !!entree.domiciliation, resume: nettoie(entree.resume_besoin, 400) };
  return { ok: true, affiche: "Le site affiche le récapitulatif avec la case domiciliation et le bouton « Confirmer le devis ».", offre: o.titre, total_mensuel_ht: o.total_mensuel_ht };
}
export async function vueRecap(memo) {
  if (!memo.recap || !memo.criteres) return null;
  const o = (await options(memo.criteres)).options.find(x => x.id === memo.recap.option_id);
  if (!o) return null;
  const r = memo.recap;
  return { titre: o.titre, detail: o.detail, date: o.date, prix: o.total_mensuel_ht, dom_prix: prixDom(o), domiciliation: r.domiciliation, contact: `${r.prenom} ${r.nom} · ${r.societe}`, email: r.email };
}

// Création du devis, déclenchée uniquement par le bouton « Confirmer le devis » (jamais par le modèle).
// Les montants sont recalculés ici depuis Nexudus. Si Nexudus refuse la création du devis, la demande arrive
// quand même dans le CRM (carte « Devis à envoyer ») pour que l'équipe le prépare à la main.
export async function confirmerDevis(memo, domiciliation) {
  if (memo.devis) return { ok: true, devis: memo.devis };
  const r = memo.recap;
  if (!r || !memo.criteres) return { ok: false };
  const o = (await options(memo.criteres)).options.find(x => x.id === r.option_id);
  if (!o) return { ok: false, indispo: true };
  if (memo.peutCreer && !memo.peutCreer()) return { ok: false, limite: true };
  const dom = domiciliation === undefined ? r.domiciliation : !!domiciliation;
  const c = await contact({ nom: `${r.prenom} ${r.nom}`, email: r.email, tel: r.telephone, societe: r.societe, compte: true, note: `Prospect venu par l’agent des Légendes (site vitrine) (devis ${o.titre}).` });
  const reference = ref();
  const debut = `${o.date}T00:00:00Z`, jour = Math.min(28, Number(o.date.slice(8, 10)) || 1);
  const expire = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10) + "T00:00:00Z";
  let idDevis = null, domOk = false;
  try {
    const devis = await creer("/billing/proposals", {
      IssuedById: CFG.business, ResponsibleId: RESPONSABLE, CoworkerId: c.id, Reference: reference, ProposalStatus: 1,
      TariffId: o.tarif, Quantity: o.quantite, BillingDay: jour, StartDate: debut, ExpirationDate: expire,
      ...(o.unite ? { Desks: [o.unite] } : o.unites?.length ? { Desks: o.unites } : {}),
      Notes: `Proposition préparée pour ${r.societe}. Valable 15 jours. Montants HT.`,
    });
    idDevis = devis.Value && devis.Value.Id;
    if (dom && idDevis) {
      try { await creer("/billing/proposalcontracts", { ProposalId: idDevis, TariffId: DOMIC_MEMBRE, Quantity: 1, BillingDay: jour, StartDate: debut, Price: prixDom(o) }); domOk = true; }
      catch (e) { console.error("Domiciliation non ajoutée au devis :", e.status || ""); }
    }
  } catch (e) { console.error("Devis Nexudus non créé :", e.status || ""); }
  const total = o.total_mensuel_ht + (dom ? prixDom(o) : 0);
  await nx("POST", "/crm/crmopportunities", {
    Name: `Devis ${reference} · ${o.titre} · ${r.societe}`.slice(0, 120), CrmBoardColumnId: COLONNE_DEVIS, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1, ResponsibleId: RESPONSABLE,
    DueDate: new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 19) + "Z", Value: total * 12,
    Notes: [idDevis ? `Devis ${reference} préparé par l’agent des Légendes (brouillon à relire puis envoyer depuis Flow).` : `Devis ${reference} demandé via l’agent des Légendes : à créer dans Flow (création automatique impossible).`,
      `${o.titre} · ${o.quantite} × ${eur(o.prix_unitaire)} HT${dom ? ` · domiciliation (${eur(prixDom(o))} HT)` : ""}`, `Total mensuel : ${eur(total)} HT · arrivée le ${o.date}`,
      `Contact : ${r.prenom} ${r.nom} · ${r.societe} · ${r.email}${r.telephone ? " · " + r.telephone : ""}`, r.resume && `Besoin : ${r.resume}`].filter(Boolean).join("\n"),
    UtmSource: "site-vitrine", UtmMedium: "agent-ia",
  }).catch(e => console.error("Carte CRM non créée :", e.status || ""));
  memo.devis = { reference, total, titre: o.titre, date: o.date, quantite: o.quantite, domiciliation: dom, societe: r.societe, brouillon: !!idDevis };
  return { ok: true, devis: memo.devis };
}
// Création avec repli si le chemin d'API diffère.
async function creer(chemin, corps) {
  try { return await nx("POST", chemin, corps); }
  catch (e) { if (e.status !== 404) throw e; return nx("POST", chemin.replace("/billing/", "/crm/"), corps); }
}

// ---- Appel du modèle ----
async function claude(cle, system, messages) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELE(), max_tokens: 700, system, tools: OUTILS, messages }),
  });
  const d = await r.json().catch(() => ({}));
  // Le message d'erreur ne reprend que le statut et le type d'erreur renvoyés par Anthropic (jamais la clé ni les en-têtes).
  if (!r.ok) { const e = new Error(`IA ${r.status} ${String(d.error?.type || "")}`); e.status = r.status; e.ia = true; throw e; }
  return d;
}

// Si le texte annonce une ouverture de formulaire sans l'avoir faite, on la fait pour de bon.
function actionAnnoncee(texte) {
  if (!/(ouvert|ouvre|opened|open)/i.test(texte) || !/(formulaire|form|réservation|booking|page)/i.test(texte)) return null;
  if (/visite|visit/i.test(texte)) return "visite";
  if (/carnet|pass/i.test(texte)) return "pass";
  if (/salle|room/i.test(texte)) return "salle";
  if (/poste|desk|journée|day/i.test(texte)) return "poste";
  return null;
}
const memeCriteres = (a, b) => a && b && a.personnes === b.personnes && a.date_arrivee === b.date_arrivee;

// Une conversation : historique texte du visiteur + petite mémoire (critères, offre choisie, récapitulatif, devis) renvoyée par le navigateur.
export async function repondre({ historique, lang, memo, cle }) {
  const donnees = await contexte(lang);
  const offresEnCours = memo.criteres ? (await options(memo.criteres)).options.map(o => ({ id: o.id, titre: o.titre, total_mensuel_ht: o.total_mensuel_ht })) : [];
  const etat = {
    criteres: memo.criteres || null, offres_affichees: offresEnCours, offre_choisie: memo.choix || null,
    recapitulatif_affiche: memo.recap ? { ...memo.recap, resume: undefined } : null, devis_cree: memo.devis ? { reference: memo.devis.reference } : null,
  };
  const system = consignes(lang, donnees, etat);
  const messages = historique.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: nettoie(m.content, 1500) })).filter(m => m.content).slice(-16);
  while (messages.length && messages[0].role !== "user") messages.shift();
  const sortie = { actions: [], offres: null, recap: null };
  const textes = []; // le texte écrit avant un appel d'outil fait partie de la réponse
  for (let tour = 0; tour < 4; tour++) {
    const d = await claude(cle, system, messages);
    const appels = (d.content || []).filter(b => b.type === "tool_use");
    const t = (d.content || []).filter(b => b.type === "text").map(b => b.text.trim()).filter(Boolean).join("\n");
    if (t) textes.push(t);
    if (!appels.length || d.stop_reason !== "tool_use") {
      sortie.texte = textes.join("\n\n").trim();
      if (!sortie.actions.length) { const a = actionAnnoncee(sortie.texte); if (a) sortie.actions.push(a); }
      return sortie;
    }
    messages.push({ role: "assistant", content: d.content });
    const resultats = [];
    for (const a of appels) {
      let res;
      try {
        if (a.name === "chercher_espaces") {
          const avant = memo.criteres;
          res = await options(a.input || {});
          memo.criteres = { personnes: res.personnes, date_arrivee: res.date_arrivee, budget_mensuel_ht: (a.input || {}).budget_mensuel_ht || 0 };
          if (!memeCriteres(avant, memo.criteres)) { sortie.offres = res; memo.choix = null; memo.recap = null; }
          else res.deja_affichees = true;
        }
        else if (a.name === "preparer_devis") { res = await preparerDevis(a.input || {}, memo); if (res.ok) sortie.recap = await vueRecap(memo); }
        else if (a.name === "ouvrir_formulaire") { res = { ok: true, affiche: "Le site ouvre la section et l'indique au visiteur." }; if (!sortie.actions.includes(a.input?.quoi)) sortie.actions.push(a.input?.quoi); }
        else res = { ok: false, erreur: "Outil inconnu." };
      } catch (e) { console.error("outil", a.name, e.status || ""); res = { ok: false, erreur: "Le service est momentanément indisponible. Proposez une visite ou un rappel." }; }
      resultats.push({ type: "tool_result", tool_use_id: a.id, content: JSON.stringify(res) });
    }
    messages.push({ role: "user", content: resultats });
  }
  sortie.texte = lang === "en" ? "Let me hand over to the team: book a visit and we'll prepare everything with you." : "Je préfère vous mettre en relation avec l'équipe : réservez une visite et nous préparerons tout avec vous.";
  return sortie;
}

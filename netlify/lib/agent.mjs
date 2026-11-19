// Concierge IA du site : répond aux questions, propose les espaces réellement libres et prépare un devis Nexudus.
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

function consignes(lang, donnees) {
  const fr = lang !== "en";
  return `Tu es « L'agent des Légendes » (en anglais : « the Legends' agent »), l'agent du Bureau des Légendes qui renseigne et conseille les visiteurs jusqu'au devis, un lieu de travail haut de gamme au 312, boulevard Haussmann (Paris 9e), installé dans un immeuble haussmannien. Tu réponds sur le site web à des visiteurs : indépendants, dirigeants, équipes qui cherchent un bureau.

Langue : ${fr ? "français, vouvoiement" : "English"}. Ton : sobre, chaleureux, précis, jamais commercial ni familier. Réponses courtes : 2 à 4 phrases, sans titres. Tu peux utiliser **gras** avec parcimonie. Pas d'emoji.

Règles absolues :
- Tu n'affirmes que ce qui figure dans les DONNÉES ci-dessous ou dans les résultats d'outils. Si une information manque (parking, animaux, accès PMR, etc.), dis-le simplement et propose une visite ou un échange avec l'équipe.
- Prix toujours en euros HT par mois (ou par heure / par jour quand c'est le cas). Aucune remise, aucun geste commercial, aucune promesse de disponibilité hors outils.
- Ne demande jamais de moyen de paiement.

Parcours « devis » (bureau privé, postes attitrés ou formule nomade) :
1. Recueille, en une ou deux questions naturelles : nombre de personnes, date d'arrivée souhaitée (par défaut le ${premierDuMoisSuivant()}), et éventuellement le budget ou la domiciliation de la société.
2. Appelle l'outil chercher_espaces. Le site affiche lui-même les offres sous forme de cartes : présente-les en une phrase, sans recopier tous les chiffres, et aide à choisir.
3. Quand le visiteur a choisi, demande prénom, nom, e-mail professionnel et société (téléphone facultatif).
4. Fais un récapitulatif en une phrase (offre, date, montant mensuel HT) et demande une confirmation explicite.
5. Seulement après un « oui » clair, appelle creer_devis. Explique ensuite que le devis sera relu puis envoyé par l'équipe, et qu'il pourra être accepté en ligne.

Autres demandes : pour une visite, appelle ouvrir_formulaire avec "visite" ; pour réserver une salle à l'heure ou un poste à la journée, appelle ouvrir_formulaire avec "salle" ou "poste".

DONNÉES (lues dans Nexudus à l'instant) :
${JSON.stringify(donnees)}`;
}

// ---- Outils ----
const OUTILS = [
  { name: "chercher_espaces", description: "Liste les offres réellement disponibles pour un nombre de personnes et une date d'arrivée : bureaux privés libres, postes attitrés, formule nomade. Renvoie des options avec un identifiant, à utiliser ensuite dans creer_devis.",
    input_schema: { type: "object", properties: { personnes: { type: "integer", minimum: 1, maximum: 40 }, date_arrivee: { type: "string", description: "AAAA-MM-JJ" }, budget_mensuel_ht: { type: "number" }, domiciliation: { type: "boolean" } }, required: ["personnes"] } },
  { name: "creer_devis", description: "Crée le devis dans Nexudus (brouillon relu par l'équipe) et la fiche dans le CRM. À n'appeler qu'après confirmation explicite du visiteur.",
    input_schema: { type: "object", properties: { option_id: { type: "string" }, prenom: { type: "string" }, nom: { type: "string" }, email: { type: "string" }, societe: { type: "string" }, telephone: { type: "string" }, domiciliation: { type: "boolean" }, resume_besoin: { type: "string", description: "Résumé en une ou deux phrases du besoin exprimé, pour l'équipe." } },
      required: ["option_id", "prenom", "nom", "email", "societe"] } },
  { name: "ouvrir_formulaire", description: "Ouvre sur la page le formulaire adapté : visite du lieu, réservation de salle ou de poste.",
    input_schema: { type: "object", properties: { quoi: { type: "string", enum: ["visite", "salle", "poste"] } }, required: ["quoi"] } },
];

// Options calculées côté serveur à partir de Nexudus (le modèle ne fait que les désigner).
async function options({ personnes, date_arrivee, budget_mensuel_ht, domiciliation }) {
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
  const avecDom = !!domiciliation;
  res.forEach(o => { o.domiciliation = avecDom; o.domiciliation_ht = avecDom ? (o.type === "bureau" ? 0 : 45) : 0; o.total_mensuel_ht += o.domiciliation_ht; });
  const budget = Number(budget_mensuel_ht) || 0;
  res.sort((a, b) => (budget ? Math.abs(a.total_mensuel_ht - budget) - Math.abs(b.total_mensuel_ht - budget) : 0));
  return { personnes: n, date_arrivee: date, options: res.slice(0, 3), aucune_offre_bureau: !res.some(o => o.type === "bureau") };
}

const ref = () => "BDL-" + Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

async function creerDevis(entree, memo) {
  // Les offres sont recalculées ici depuis Nexudus : le prix ne dépend jamais de ce que renvoie le navigateur.
  if (!memo.criteres) return { ok: false, erreur: "Appelez d'abord chercher_espaces." };
  const o = (await options(memo.criteres)).options.find(x => x.id === entree.option_id);
  if (!o) return { ok: false, erreur: "Cette offre n'est plus disponible : relancez chercher_espaces." };
  const email = nettoie(entree.email, 160).toLowerCase(), prenom = nettoie(entree.prenom, 60), nomF = nettoie(entree.nom, 60), societe = nettoie(entree.societe, 120);
  if (!emailValide(email) || /[^\x00-\x7F]/.test(email)) return { ok: false, erreur: "Adresse e-mail invalide : redemandez-la." };
  if (!prenom || !nomF || societe.length < 2) return { ok: false, erreur: "Prénom, nom et société sont nécessaires." };
  if (memo.devis) return { ok: true, deja: true, reference: memo.devis.reference };
  if (memo.peutCreer && !memo.peutCreer()) return { ok: false, erreur: "Limite de devis atteinte pour aujourd'hui : proposez une visite ou un rappel par l'équipe." };
  const dom = entree.domiciliation ?? o.domiciliation;
  const c = await contact({ nom: `${prenom} ${nomF}`, email, tel: nettoie(entree.telephone, 40), societe, compte: true, note: `Prospect venu par le concierge IA du site vitrine (devis ${o.titre}).` });
  const reference = ref();
  const debut = `${o.date}T00:00:00Z`;
  const expire = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10) + "T00:00:00Z";
  const resume = nettoie(entree.resume_besoin, 400);
  const devis = await creer("/billing/proposals", {
    IssuedById: CFG.business, ResponsibleId: RESPONSABLE, CoworkerId: c.id, Reference: reference, ProposalStatus: 1,
    TariffId: o.tarif, Quantity: o.quantite, BillingDay: Math.min(28, Number(o.date.slice(8, 10)) || 1), StartDate: debut, ExpirationDate: expire,
    ...(o.unite ? { Desks: [o.unite] } : o.unites?.length ? { Desks: o.unites } : {}),
    Notes: `Proposition préparée pour ${societe}. Valable 15 jours. Montants HT.`,
  });
  const idDevis = devis.Value && devis.Value.Id;
  let domOk = false;
  if (dom && idDevis) {
    try { await creer("/billing/proposalcontracts", { ProposalId: idDevis, TariffId: DOMIC_MEMBRE, Quantity: 1, BillingDay: Math.min(28, Number(o.date.slice(8, 10)) || 1), StartDate: debut, Price: o.type === "bureau" ? 0 : 45 }); domOk = true; }
    catch (e) { console.error("Domiciliation non ajoutée au devis :", e.message); }
  }
  const total = o.prix_unitaire * o.quantite + (domOk ? (o.type === "bureau" ? 0 : 45) : 0);
  await nx("POST", "/crm/crmopportunities", {
    Name: `Devis ${reference} · ${o.titre} · ${societe}`.slice(0, 120), CrmBoardColumnId: COLONNE_DEVIS, CoworkerId: c.id, Status: 1, Position: 0, LeadSource: 1, ResponsibleId: RESPONSABLE,
    DueDate: new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 19) + "Z", Value: total * 12,
    Notes: [`Devis ${reference} préparé par le concierge IA du site (brouillon à relire puis envoyer depuis Flow).`, `${o.titre} · ${o.quantite} × ${eur(o.prix_unitaire)} HT${domOk ? " · domiciliation incluse" : ""}`, `Total mensuel : ${eur(total)} HT · arrivée le ${o.date}`, `Contact : ${prenom} ${nomF} · ${societe} · ${email}${entree.telephone ? " · " + nettoie(entree.telephone, 40) : ""}`, resume && `Besoin : ${resume}`].filter(Boolean).join("\n"),
    UtmSource: "site-vitrine", UtmMedium: "concierge-ia",
  }).catch(e => console.error("Carte CRM non créée :", e.message));
  memo.devis = { reference, total, titre: o.titre, date: o.date, quantite: o.quantite, domiciliation: domOk, societe };
  return { ok: true, reference, total_mensuel_ht: total, offre: o.titre, date_arrivee: o.date, domiciliation: domOk, statut: "brouillon relu puis envoyé par l'équipe" };
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

// Une conversation : historique texte du visiteur + petite mémoire (critères de recherche, devis déjà créé) renvoyée par le navigateur.
export async function repondre({ historique, lang, memo, cle }) {
  const donnees = await contexte(lang);
  const system = consignes(lang, donnees);
  const messages = historique.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: nettoie(m.content, 1500) })).filter(m => m.content).slice(-16);
  while (messages.length && messages[0].role !== "user") messages.shift();
  const sortie = { actions: [], offres: null, devis: null };
  for (let tour = 0; tour < 4; tour++) {
    const d = await claude(cle, system, messages);
    const appels = (d.content || []).filter(b => b.type === "tool_use");
    if (!appels.length || d.stop_reason !== "tool_use") {
      sortie.texte = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      return sortie;
    }
    messages.push({ role: "assistant", content: d.content });
    const resultats = [];
    for (const a of appels) {
      let res;
      try {
        if (a.name === "chercher_espaces") { res = await options(a.input || {}); memo.criteres = { personnes: res.personnes, date_arrivee: res.date_arrivee, domiciliation: !!(a.input || {}).domiciliation, budget_mensuel_ht: (a.input || {}).budget_mensuel_ht || 0 }; sortie.offres = res; }
        else if (a.name === "creer_devis") { res = await creerDevis(a.input || {}, memo); if (res.ok) sortie.devis = memo.devis; }
        else if (a.name === "ouvrir_formulaire") { res = { ok: true }; sortie.actions.push(a.input?.quoi); }
        else res = { ok: false, erreur: "Outil inconnu." };
      } catch (e) { console.error("outil", a.name, e.message); res = { ok: false, erreur: "Le service est momentanément indisponible. Proposez une visite ou un rappel." }; }
      resultats.push({ type: "tool_result", tool_use_id: a.id, content: JSON.stringify(res) });
    }
    messages.push({ role: "user", content: resultats });
  }
  sortie.texte = lang === "en" ? "Let me hand over to the team: book a visit and we'll prepare everything with you." : "Je préfère vous mettre en relation avec l'équipe : réservez une visite et nous préparerons tout avec vous.";
  return sortie;
}

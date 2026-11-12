// Catalogue lu dans Nexudus : horaires, salles, postes, tarifs, services et formules.
// Le site ne garde en dur que les identifiants (quelle ressource va où sur les pages) et des valeurs de secours.
// Tout le reste (noms, prix, capacités, équipements, descriptions, horaires, coordonnées) vient de Nexudus,
// relu au plus toutes les 60 secondes : une modification dans Nexudus apparaît sur le site dans la minute.
import { CFG, SALLES, HORAIRES, POSTES, TARIFS_POSTE, PRODUITS_RESA, FORMULES_NX, PASS_NX, nx } from "./nexudus.mjs";

// Tarifs Nexudus (resource rates) des postes flexibles.
export const TARIF_DEMI_JOURNEE = Number(process.env.NEXUDUS_RATE_DEMI || 1415437351);
export const TARIF_JOURNEE = Number(process.env.NEXUDUS_RATE_JOURNEE || 1415437449);

// Équipements : cases à cocher de la fiche ressource Nexudus.
const EQUIPEMENTS = ["NaturalLight", "StandingDesk", "QuietZone", "DualDisplayScreen", "DesktopMonitor", "LargeDisplay", "DisplayScreen", "Projector", "VideoConferencing", "WirelessPresentation",
  "ConferencePhone", "WhiteBoard", "FlipChart", "Soundproof", "AirConditioning", "Internet", "WirelessCharger", "PrivacyScreen", "SecureStorage", "TeaAndCoffee", "Catering", "Drinks"];
const JOURS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const texte = html => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const nombre = v => (typeof v === "number" && isFinite(v) ? v : null);
// Catégorie d'un poste sur le plan, déduite de ses équipements Nexudus.
const zoneDe = r => r.StandingDesk ? "debout" : (r.DualDisplayScreen || r.DesktopMonitor) ? "ecran" : r.QuietZone ? "calme" : r.NaturalLight ? "fenetre" : null;

// Nexudus limite le nombre d'appels simultanés : les lectures se font l'une après l'autre, avec une nouvelle tentative en cas de 429.
const erreurs = [];
const noter = (quoi, e) => { console.error("catalogue", quoi, e.message); if (erreurs.length < 8) erreurs.push(`${quoi} : ${String(e.message || "").slice(0, 140)}`); };
async function lireNx(chemin) {
  for (let essai = 0; ; essai++) {
    try { return await nx("GET", chemin); }
    catch (e) { if (e.status !== 429 || essai >= 2) throw e; await new Promise(r => setTimeout(r, 1500 * (essai + 1))); }
  }
}
async function liste(chemin, filtre) {
  const tout = [];
  for (let page = 1; page <= 4; page++) {
    const d = await lireNx(`${chemin}?${filtre}&size=100&page=${page}`);
    tout.push(...(d.Records || []));
    if (!d.HasNextPage) break;
  }
  return tout;
}
// Les fiches attendues, par identifiant : d'abord la liste de l'espace, puis une lecture directe pour celles qui manquent.
async function parIds(chemin, filtre, ids) {
  let recs = [];
  try { recs = await liste(chemin, filtre); } catch (e) { noter(chemin, e); }
  const m = new Map(recs.map(r => [Number(r.Id), r]));
  for (const id of ids.filter(id => !m.has(Number(id)))) { try { m.set(Number(id), await lireNx(`${chemin}/${id}`)); } catch (e) { noter(`${chemin}/${id}`, e); if (e.status === 429) break; } }
  return m;
}

const secours = { horaires: structuredClone(HORAIRES) };
let memo = null, enCours = null;

async function lire() {
  erreurs.length = 0;
  const lieu = await lireNx(`/sys/businesses/${CFG.business}`).catch(e => { noter("lieu", e); return null; });
  const ressources = await parIds("/spaces/resources", `Resource_Business=${CFG.business}`, [...Object.keys(SALLES), ...Object.keys(POSTES)]);
  const tarifs = await liste("/billing/extraservices", `ExtraService_Business=${CFG.business}`).catch(e => { noter("tarifs", e); return []; });
  const produits = await parIds("/billing/products", `Product_Business=${CFG.business}`, Object.keys(PRODUITS_RESA));
  const formules = await parIds("/billing/tariffs", `Tariff_Business=${CFG.business}`, Object.keys(FORMULES_NX));

  // Prochains événements publiés (l'inscription se fait dans le portail membre).
  const maintenant = Date.now(), date = v => new Date(/Z$|[+-]\d\d:?\d\d$/.test(String(v)) ? v : v + "Z");
  const evenements = (await liste("/content/calendarevents", `CalendarEvent_Business=${CFG.business}&orderBy=StartDate&dir=Descending`).catch(e => { noter("evenements", e); return []; }))
    .filter(e => Number(e.BusinessId) === CFG.business && e.StartDate && date(e.StartDate).getTime() > maintenant && (!e.PublishDate || date(e.PublishDate).getTime() <= maintenant))
    .sort((a, b) => date(a.StartDate) - date(b.StartDate)).slice(0, 3)
    .map(e => ({ id: Number(e.Id), nom: e.Name, resume: texte(e.ShortDescription), lieu: e.Location || "", debut: date(e.StartDate).toISOString(), fin: e.EndDate ? date(e.EndDate).toISOString() : null, places: nombre(e.Allocation), reserveMembres: !!e.OnlyForMembers }));
  // Plan d'étage : bureaux privés (type 1) et postes attitrés (type 2) proposés à la location, avec leur occupation. Aucun nom d'occupant n'est transmis.
  const plan = (await liste("/sys/floorplandesks", `FloorPlanDesk_FloorPlan_Business=${CFG.business}`).catch(e => { noter("plan", e); return []; }))
    .filter(x => Number(x.FloorPlanBusinessId) === CFG.business && !/^archive/i.test(x.FloorPlanName || "") && x.Available !== false && nombre(x.Price) > 0);
  const occupe = x => !!(x.CoworkerId || x.CoworkerContractIds);
  const bureaux = plan.filter(x => x.ItemType === 1).map(x => ({ nom: x.Name, etage: String(x.FloorPlanName || "").split(" — ")[0], capacite: nombre(x.Capacity), surface: nombre(x.Area) ?? nombre(x.Size), prix: x.Price, libre: !occupe(x) }));
  const attitres = plan.filter(x => x.ItemType === 2), postesAttitres = { total: attitres.length, libres: attitres.filter(x => !occupe(x)).length };
  const lu = { lieu: false, ressources: 0, tarifs: 0, produits: 0, formules: 0 };

  // Horaires d'ouverture du lieu (minutes depuis minuit dans Nexudus).
  if (lieu && nombre(lieu.MondayOpenTime) !== null) {
    JOURS.forEach((j, i) => {
      const o = nombre(lieu[j + "OpenTime"]), f = nombre(lieu[j + "CloseTime"]);
      HORAIRES[i] = lieu[j + "Closed"] || o === null || f === null || f <= o ? null : [Math.ceil(o / 60), Math.floor(f / 60)];
    });
    lu.lieu = true;
  }
  const coord = lieu ? {
    nom: lieu.Name || null, adresse: [lieu.StreetNumber, lieu.StreetName].filter(Boolean).join(" ") || lieu.Address || null,
    codePostal: lieu.PostalCode || null, ville: lieu.TownCity || null, telephone: lieu.Phone || lieu.ContactPhoneNumber || null, email: lieu.EmailContact || lieu.ContactEmail || null,
  } : null;

  // Tarifs publics (ni réservés aux membres, ni crédits) de l'espace.
  const publics = tarifs.filter(t => Number(t.BusinessId) === CFG.business && !t.OnlyForMembers && !t.IsBookingCredit && !t.IsPrintingCredit);
  const prixHoraire = type => {
    const t = publics.filter(x => x.ChargePeriod === 1 && String(x.ResourceTypeNames || "").split(",").map(s => s.trim()).includes(type));
    const c = t.find(x => x.IsDefaultPrice) || t[0];
    return c ? nombre(c.Price) : null;
  };
  const tarif = id => { const t = tarifs.find(x => Number(x.Id) === id); return t ? nombre(t.Price) : null; };
  const demi = tarif(TARIF_DEMI_JOURNEE), journee = tarif(TARIF_JOURNEE);
  if (demi !== null) { TARIFS_POSTE.matin = demi; TARIFS_POSTE.apres = demi; lu.tarifs++; }
  if (journee !== null) { TARIFS_POSTE.journee = journee; lu.tarifs++; }

  const equip = r => EQUIPEMENTS.filter(k => r[k] === true);
  for (const [id, s] of Object.entries(SALLES)) {
    const r = ressources.get(Number(id)); if (!r) continue; lu.ressources++;
    if (r.Name) s.nom = r.Name;
    const p = prixHoraire(r.ResourceTypeName); if (p !== null) { s.prixHeure = p; lu.tarifs++; }
    s.groupe = String(r.GroupName || "").replace(/^[^\p{L}\p{N}]+/u, "").trim(); s.places = nombre(r.Allocation); s.description = texte(r.Description); s.equipements = equip(r); s.visible = r.Visible !== false && !r.Archived;
  }
  for (const [id, p] of Object.entries(POSTES)) {
    const r = ressources.get(Number(id)); if (!r) continue; lu.ressources++;
    if (r.Name) p.nom = r.Name;
    p.zone = zoneDe(r) || p.zone; p.description = texte(r.Description); p.equipements = equip(r);
  }
  for (const [id, p] of Object.entries(PRODUITS_RESA)) {
    const r = produits.get(Number(id)); if (!r) continue; lu.produits++;
    if (r.Name) p.nom = r.Name; if (nombre(r.Price) !== null) p.prix = r.Price; p.description = texte(r.Description);
  }
  for (const [id, f] of Object.entries(FORMULES_NX)) {
    const r = formules.get(Number(id)); if (!r) continue; lu.formules++;
    if (r.Name) f.nom = r.Name; if (nombre(r.Price) !== null) f.prix = r.Price; f.description = texte(r.Description);
  }
  const passLus = await parIds("/billing/timepasses", `TimePass_Business=${CFG.business}`, Object.values(PASS_NX).map(p => p.id));
  lu.pass = 0;
  for (const p of Object.values(PASS_NX)) { const r = passLus.get(p.id); if (!r) continue; lu.pass++; if (r.Name) p.nom = r.Name; if (nombre(r.Price) !== null) p.prix = r.Price; }
  lu.evenements = evenements.length; lu.plan = plan.length;
  return { lu: { ...lu, erreurs: [...erreurs] }, coord, evenements, bureaux, postesAttitres, quand: new Date().toISOString() };
}

// À appeler au début de chaque fonction : met à jour SALLES, POSTES, HORAIRES, TARIFS_POSTE, PRODUITS_RESA et FORMULES_NX depuis Nexudus.
// En cas d'échec, les dernières valeurs lues (ou, à défaut, les valeurs de secours du code) restent en place.
export async function synchro() {
  if (memo && Date.now() - memo.t < 60e3) return memo.v;
  if (!enCours) enCours = lire().then(v => { memo = { t: Date.now(), v }; return v; })
    .catch(e => { console.error("catalogue", e.message); const v = memo ? memo.v : { lu: null, coord: null, quand: null, erreur: String(e.message || "").slice(0, 200) }; memo = { t: Date.now() - 45e3, v }; return v; })
    .finally(() => { enCours = null; });
  return enCours;
}

// Vue publique du catalogue, pour les pages du site.
export async function catalogue() {
  const etat = await synchro();
  const direct = !!(etat.lu && etat.lu.ressources);
  return {
    source: direct ? "nexudus" : "secours", lu: etat.quand, detail: etat.lu, lieu: etat.coord,
    horaires: direct || (etat.lu && etat.lu.lieu) ? HORAIRES : secours.horaires,
    salles: Object.entries(SALLES).map(([id, s]) => ({ id: Number(id), nom: s.nom, prixHeure: s.prixHeure, places: s.places ?? null, groupe: s.groupe || "", description: s.description || "", equipements: s.equipements || [], visible: s.visible !== false })),
    postes: Object.entries(POSTES).map(([id, p]) => ({ id: Number(id), nom: p.nom, zone: p.zone, description: p.description || "", equipements: p.equipements || [] })),
    tarifsPoste: { ...TARIFS_POSTE },
    produits: Object.entries(PRODUITS_RESA).map(([id, p]) => ({ id: Number(id), nom: p.nom, prix: p.prix, description: p.description || "", parPersonne: p.parPersonne })),
    pass: Object.fromEntries(Object.entries(PASS_NX).map(([k, p]) => [k, { nom: p.nom, prix: p.prix, quantite: p.quantite, total: p.prix * p.quantite }])),
    evenements: etat.evenements || [], bureaux: etat.bureaux || [], postesAttitres: etat.postesAttitres || null,
    formules: Object.entries(FORMULES_NX).map(([id, f]) => ({ id: Number(id), nom: f.nom, prix: f.prix, description: f.description || "" })),
  };
}

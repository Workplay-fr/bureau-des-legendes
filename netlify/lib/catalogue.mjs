// Catalogue lu dans Nexudus : horaires, salles, postes, tarifs, services et formules.
// Le site ne garde en dur que les identifiants (quelle ressource va où sur les pages) et des valeurs de secours.
// Tout le reste (noms, prix, capacités, équipements, descriptions, horaires, coordonnées) vient de Nexudus,
// relu au plus toutes les 60 secondes : une modification dans Nexudus apparaît sur le site dans la minute.
import { CFG, SALLES, HORAIRES, POSTES, TARIFS_POSTE, PRODUITS_RESA, FORMULES_NX, nx } from "./nexudus.mjs";

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

async function liste(chemin, filtre) {
  const tout = [];
  for (let page = 1; page <= 4; page++) {
    const d = await nx("GET", `${chemin}?${filtre}&size=100&page=${page}`);
    tout.push(...(d.Records || []));
    if (!d.HasNextPage) break;
  }
  return tout;
}
// Les fiches attendues, par identifiant : d'abord la liste de l'espace, puis une lecture directe pour celles qui manquent.
async function parIds(chemin, filtre, ids) {
  let recs = [];
  try { recs = await liste(chemin, filtre); } catch (e) { console.error("catalogue", chemin, e.message); }
  const m = new Map(recs.map(r => [Number(r.Id), r]));
  await Promise.all(ids.filter(id => !m.has(Number(id))).map(async id => { try { m.set(Number(id), await nx("GET", `${chemin}/${id}`)); } catch (e) { console.error("catalogue", chemin, id, e.message); } }));
  return m;
}

const secours = { horaires: structuredClone(HORAIRES) };
let memo = null, enCours = null;

async function lire() {
  const [lieu, ressources, tarifs, produits, formules] = await Promise.all([
    nx("GET", `/sys/businesses/${CFG.business}`).catch(e => { console.error("catalogue lieu", e.message); return null; }),
    parIds("/spaces/resources", `Resource_Business=${CFG.business}`, [...Object.keys(SALLES), ...Object.keys(POSTES)]),
    liste("/spaces/extraservices", `ExtraService_Business=${CFG.business}`).catch(e => { console.error("catalogue tarifs", e.message); return []; }),
    parIds("/billing/products", `Product_Business=${CFG.business}`, Object.keys(PRODUITS_RESA)),
    parIds("/billing/tariffs", `Tariff_Business=${CFG.business}`, Object.keys(FORMULES_NX)),
  ]);
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
    s.places = nombre(r.Allocation); s.description = texte(r.Description); s.equipements = equip(r); s.visible = r.Visible !== false && !r.Archived;
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
  return { lu, coord, quand: new Date().toISOString() };
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
    salles: Object.entries(SALLES).map(([id, s]) => ({ id: Number(id), nom: s.nom, prixHeure: s.prixHeure, places: s.places ?? null, description: s.description || "", equipements: s.equipements || [], visible: s.visible !== false })),
    postes: Object.entries(POSTES).map(([id, p]) => ({ id: Number(id), nom: p.nom, zone: p.zone, description: p.description || "", equipements: p.equipements || [] })),
    tarifsPoste: { ...TARIFS_POSTE },
    produits: Object.entries(PRODUITS_RESA).map(([id, p]) => ({ id: Number(id), nom: p.nom, prix: p.prix, description: p.description || "", parPersonne: p.parPersonne })),
    formules: Object.entries(FORMULES_NX).map(([id, f]) => ({ id: Number(id), nom: f.nom, prix: f.prix, description: f.description || "" })),
  };
}

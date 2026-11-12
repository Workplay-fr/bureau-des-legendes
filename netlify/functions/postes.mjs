// Réservation d'un poste flexible du 1er étage depuis le plan 3D du site.
//   GET  /api/postes?jour=AAAA-MM-JJ  → réservations de chacun des 20 postes ce jour-là (lues dans Nexudus)
//   POST /api/postes                  → crée (ou retrouve) le contact puis la réservation du poste dans Nexudus
// Le paiement affiché sur le site est une simulation : aucune donnée bancaire n'est reçue ici.
import { POSTES, TARIFS_POSTE, creneauPoste, occupationPostes, nx, contact, parisVersUtc, isoZ, nettoie, emailValide, json, tropDEnvois, vide, bilingue, emailRefuse } from "../lib/nexudus.mjs";
import { synchro } from "../lib/catalogue.mjs";

const jourValide = j => /^\d{4}-\d{2}-\d{2}$/.test(j || "");
const NOMS_CRENEAU = { matin: "matin", apres: "après-midi", journee: "journée" };
const erreurNx = e => String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "");

// Jours d'une réservation : un seul jour, ou tous les jours ouverts entre deux dates (31 jours au plus) qui tombent sur les jours de semaine retenus.
const JOURS_NX = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
function joursPeriode(jour, fin, jsem) {
  if (!fin) return [jour];
  const [y, m, d] = jour.split("-").map(Number), c = new Date(Date.UTC(y, m - 1, d)), res = [];
  for (let k = 0; k < 32; k++, c.setUTCDate(c.getUTCDate() + 1)) { const v = c.toISOString().slice(0, 10); if (v > fin) break; if (jsem.includes(c.getUTCDay()) && creneauPoste(v, "journee")) res.push(v); }
  return res;
}
function lirePeriode(src, jour) {
  const fin = jourValide(src.fin) && src.fin > jour && (Date.parse(src.fin) - Date.parse(jour)) / 864e5 <= 31 ? src.fin : null;
  const jsem = String(src.jsem ?? "1,2,3,4,5").split(",").map(Number).filter(n => n >= 1 && n <= 6).filter((n, i, t) => t.indexOf(n) === i);
  return { fin, jsem: jsem.length ? jsem : [1, 2, 3, 4, 5] };
}
const chevauche = (occ, id, de, a) => (occ[id] || []).some(b => new Date(b.a) > de && new Date(b.de) < a);

// État de chaque poste pour chaque créneau, sur l'ensemble des jours demandés : "libre" seulement si le poste l'est tous ces jours-là,
// "pris" dès qu'un jour est réservé, "passe" si un créneau est déjà terminé ou le lieu fermé. Le prix est celui de tous les jours réunis.
function etatPostes(jours, occ) {
  const limite = new Date(Date.now() + 30 * 60e3), jour = jours[0] || null;
  const creneaux = {};
  for (const c of Object.keys(TARIFS_POSTE)) {
    const h = jour && creneauPoste(jour, c);
    creneaux[c] = h && h[1] > h[0] ? { de: h[0], a: h[1], prix: TARIFS_POSTE[c] * jours.length, parJour: TARIFS_POSTE[c] } : null;
  }
  const postes = Object.entries(POSTES).map(([id, p]) => {
    const etat = {};
    for (const [c, h0] of Object.entries(creneaux)) {
      if (!h0) { etat[c] = "passe"; continue; }
      let e = "libre";
      for (const j of jours) {
        const h = creneauPoste(j, c); if (!h || h[1] <= h[0]) { e = "passe"; break; }
        const de = parisVersUtc(j, h[0]), a = parisVersUtc(j, h[1]);
        if (a < limite) { e = "passe"; break; }
        if (chevauche(occ, id, de, a)) e = "pris";
      }
      etat[c] = e;
    }
    return { id: Number(id), nom: p.nom, zone: p.zone, description: p.description || "", equipements: p.equipements || [], etat };
  }).sort((x, y) => x.nom.localeCompare(y.nom));
  return { jour, jours, nbJours: jours.length, ouvert: Object.values(creneaux).some(Boolean), creneaux, postes };
}

const traiter = async (req) => {
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  await synchro(); // noms, prix et horaires relus dans Nexudus (au plus toutes les 60 s)
  const url = new URL(req.url);

  if (req.method === "GET") {
    const jour = url.searchParams.get("jour");
    if (!jourValide(jour)) return json(400, { ok: false, erreur: "Jour invalide." });
    const { fin, jsem } = lirePeriode({ fin: url.searchParams.get("fin"), jsem: url.searchParams.get("jsem") ?? undefined }, jour);
    const jours = joursPeriode(jour, fin, jsem);
    if (!jours.length) return json(200, { ok: true, source: "nexudus", ...etatPostes([], {}) });
    try { return json(200, { ok: true, source: "nexudus", ...etatPostes(jours, await occupationPostes(jours[0], jours[jours.length - 1])) }); }
    catch (e) { console.error(e.message); return json(502, { ok: false, erreur: "Impossible de lire les disponibilités pour le moment.", detail: erreurNx(e) }); }
  }
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });

  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.site_web) return json(200, { ok: true });
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 4000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant de valider." });
  if (tropDEnvois(req, 4)) return json(429, { ok: false, erreur: "Trop de réservations envoyées. Réessayez dans quelques minutes." });

  const poste = Number(d.poste), p = POSTES[poste], jour = d.jour, creneau = d.creneau;
  const prenom = nettoie(d.prenom, 60), nomFamille = nettoie(d.nom, 60);
  const v = { nom: `${prenom} ${nomFamille}`.trim(), email: nettoie(d.email, 160).toLowerCase(), tel: nettoie(d.tel, 40), societe: nettoie(d.societe, 120) };
  if (!p || !jourValide(jour) || !TARIFS_POSTE[creneau]) return json(400, { ok: false, erreur: "Poste ou créneau invalide." });
  const { fin, jsem } = lirePeriode(d, jour), jours = joursPeriode(jour, fin, jsem);
  if (!jours.length) return json(400, { ok: false, erreur: "Le Bureau est fermé ce jour-là." });
  const h = creneauPoste(jours[0], creneau);
  if (!h || h[1] <= h[0]) return json(400, { ok: false, erreur: "Le Bureau est fermé ce jour-là." });
  if (prenom.length < 1 || nomFamille.length < 1) return json(400, { ok: false, erreur: "Indiquez votre prénom et votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter les conditions de réservation." });

  const de = parisVersUtc(jours[0], h[0]), a = parisVersUtc(jours[0], h[1]);
  if (a < new Date(Date.now() + 30 * 60e3) || de > new Date(Date.now() + 90 * 864e5)) return json(400, { ok: false, erreur: "Choisissez un créneau à venir." });

  try {
    const occ = await occupationPostes(jours[0], jours[jours.length - 1]);
    const pris = jours.some(j => { const x = creneauPoste(j, creneau); return chevauche(occ, poste, parisVersUtc(j, x[0]), parisVersUtc(j, x[1])); });
    if (pris) return json(409, { ok: false, erreur: `${p.nom} vient d'être réservé sur ce créneau. Choisissez un autre poste.`, ...etatPostes(jours, occ) });
    const c = await contact({ ...v, note: "Contact créé depuis le site vitrine (réservation de poste)." });
    const parJour = TARIFS_POSTE[creneau], montant = parJour * jours.length;
    // Une réservation par jour de la semaine : Nexudus la répète chaque semaine jusqu'au dernier jour de la période.
    const groupes = {}; for (const j of jours) (groupes[new Date(j + "T12:00:00Z").getUTCDay()] ||= []).push(j);
    let b = null;
    for (const [w, dates] of Object.entries(groupes)) {
      const x = creneauPoste(dates[0], creneau), repete = dates.length > 1;
      const r = await nx("POST", "/spaces/bookings", {
        ResourceId: poste, CoworkerId: c.id, FromTime: isoZ(parisVersUtc(dates[0], x[0])), ToTime: isoZ(parisVersUtc(dates[0], x[1])), Repeats: 2, WhichBookingsToUpdate: 1,
        // Mêmes réglages que les salles : créée « à confirmer », champs explicites sinon Nexudus renvoie une erreur 500 générique.
        ChargeNow: false, InvoiceNow: false, Tentative: true,
        // OverridePrice : le prix du créneau lu dans Nexudus, pour que chaque réservation porte son montant et puisse être facturée d'un clic.
        InvoiceThisCoworker: false, DoNotUseBookingCredit: false, RepeatBooking: repete, OverridePrice: parJour, IncludeZoomInvite: false,
        ...(repete ? { RepeatEvery: 1, ["RepeatOn" + JOURS_NX[w]]: true, RepeatUntil: isoZ(parisVersUtc(dates[dates.length - 1], 23, 59)) } : {}),
        Notes: [`Réservé depuis le plan 3D du site vitrine · ${NOMS_CRENEAU[creneau]}${jours.length > 1 ? ` · ${jours.length} jours du ${jours[0]} au ${jours[jours.length - 1]}` : ""} · paiement de démonstration de ${montant} € HT`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join(" · "),
      });
      b = b || r;
    }
    const id = b.Value && b.Value.Id;
    return json(200, { ok: true, montantHt: montant, nbJours: jours.length, reservation: id, reference: id ? "BDL-" + String(id).slice(-6) : null, nouveau: c.nouveau });
  } catch (e) {
    const refus = emailRefuse(e); if (refus) return refus;
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "La réservation n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: erreurNx(e) });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/postes" };

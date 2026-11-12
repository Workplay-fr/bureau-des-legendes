// Réservation d'un poste flexible du 1er étage depuis le plan 3D du site.
//   GET  /api/postes?jour=AAAA-MM-JJ  → réservations de chacun des 20 postes ce jour-là (lues dans Nexudus)
//   POST /api/postes                  → crée (ou retrouve) le contact puis la réservation du poste dans Nexudus
// Le paiement affiché sur le site est une simulation : aucune donnée bancaire n'est reçue ici.
import { POSTES, TARIFS_POSTE, creneauPoste, occupationPostes, nx, contact, parisVersUtc, isoZ, nettoie, emailValide, json, tropDEnvois, vide, bilingue, emailRefuse } from "../lib/nexudus.mjs";
import { synchro } from "../lib/catalogue.mjs";

const jourValide = j => /^\d{4}-\d{2}-\d{2}$/.test(j || "");
const NOMS_CRENEAU = { matin: "matin", apres: "après-midi", journee: "journée" };
const erreurNx = e => String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "");

// État de chaque poste pour chaque créneau du jour : "libre", "pris" ou "passe" (créneau terminé ou jour fermé).
function etatPostes(jour, occ) {
  const limite = new Date(Date.now() + 30 * 60e3);
  const creneaux = {};
  for (const c of Object.keys(TARIFS_POSTE)) {
    const h = creneauPoste(jour, c);
    creneaux[c] = h && h[1] > h[0] ? { de: h[0], a: h[1], prix: TARIFS_POSTE[c] } : null;
  }
  const postes = Object.entries(POSTES).map(([id, p]) => {
    const etat = {};
    for (const [c, h] of Object.entries(creneaux)) {
      if (!h) { etat[c] = "passe"; continue; }
      const de = parisVersUtc(jour, h.de), a = parisVersUtc(jour, h.a);
      etat[c] = a < limite ? "passe" : (occ[id] || []).some(b => new Date(b.a) > de && new Date(b.de) < a) ? "pris" : "libre";
    }
    return { id: Number(id), nom: p.nom, zone: p.zone, description: p.description || "", equipements: p.equipements || [], etat };
  }).sort((x, y) => x.nom.localeCompare(y.nom));
  return { jour, ouvert: Object.values(creneaux).some(Boolean), creneaux, postes };
}

const traiter = async (req) => {
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  await synchro(); // noms, prix et horaires relus dans Nexudus (au plus toutes les 60 s)
  const url = new URL(req.url);

  if (req.method === "GET") {
    const jour = url.searchParams.get("jour");
    if (!jourValide(jour)) return json(400, { ok: false, erreur: "Jour invalide." });
    try { return json(200, { ok: true, source: "nexudus", ...etatPostes(jour, await occupationPostes(jour)) }); }
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
  const h = creneauPoste(jour, creneau);
  if (!h || h[1] <= h[0]) return json(400, { ok: false, erreur: "Le Bureau est fermé ce jour-là." });
  if (prenom.length < 1 || nomFamille.length < 1) return json(400, { ok: false, erreur: "Indiquez votre prénom et votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter les conditions de réservation." });

  const de = parisVersUtc(jour, h[0]), a = parisVersUtc(jour, h[1]);
  if (a < new Date(Date.now() + 30 * 60e3) || de > new Date(Date.now() + 90 * 864e5)) return json(400, { ok: false, erreur: "Choisissez un créneau à venir." });

  try {
    const occ = await occupationPostes(jour);
    if ((occ[poste] || []).some(b => new Date(b.a) > de && new Date(b.de) < a)) return json(409, { ok: false, erreur: `${p.nom} vient d'être réservé sur ce créneau. Choisissez un autre poste.`, ...etatPostes(jour, occ) });
    const c = await contact({ ...v, note: "Contact créé depuis le site vitrine (réservation de poste)." });
    const montant = TARIFS_POSTE[creneau];
    const b = await nx("POST", "/spaces/bookings", {
      ResourceId: poste, CoworkerId: c.id, FromTime: isoZ(de), ToTime: isoZ(a), Repeats: 2, WhichBookingsToUpdate: 1,
      // Mêmes réglages que les salles : créée « à confirmer », champs explicites sinon Nexudus renvoie une erreur 500 générique.
      ChargeNow: false, InvoiceNow: false, Tentative: true,
      // OverridePrice : le prix du créneau lu dans Nexudus, pour que la réservation porte son montant et puisse être facturée d'un clic.
      InvoiceThisCoworker: false, DoNotUseBookingCredit: false, RepeatBooking: false, OverridePrice: montant, IncludeZoomInvite: false,
      Notes: [`Réservé depuis le plan 3D du site vitrine · ${NOMS_CRENEAU[creneau]} · paiement de démonstration de ${montant} € HT`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join(" · "),
    });
    const id = b.Value && b.Value.Id;
    return json(200, { ok: true, montantHt: montant, reservation: id, reference: id ? "BDL-" + String(id).slice(-6) : null, nouveau: c.nouveau });
  } catch (e) {
    const refus = emailRefuse(e); if (refus) return refus;
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "La réservation n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: erreurNx(e) });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/postes" };

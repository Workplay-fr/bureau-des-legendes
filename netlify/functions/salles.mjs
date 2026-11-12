// Réservation de salle de réunion depuis le site.
//   GET  /api/salles?salle=<id>&jour=AAAA-MM-JJ  → créneaux déjà pris ce jour-là (lus dans Nexudus)
//   POST /api/salles                              → crée (ou retrouve) le contact puis la réservation dans Nexudus
// Le paiement affiché sur le site est une simulation : aucune donnée bancaire n'est reçue ici.
import { SALLES, HORAIRES, nx, contact, occupation, parisVersUtc, jourSemaine, isoZ, nettoie, emailValide, json, tropDEnvois, vide, PRODUITS_RESA, bilingue } from "../lib/nexudus.mjs";
import { synchro } from "../lib/catalogue.mjs";

const jourValide = j => /^\d{4}-\d{2}-\d{2}$/.test(j || "");

const traiter = async (req) => {
  if (vide()) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." });
  await synchro(); // noms, prix et horaires relus dans Nexudus (au plus toutes les 60 s)
  const url = new URL(req.url);

  if (req.method === "GET") {
    const salle = Number(url.searchParams.get("salle")), jour = url.searchParams.get("jour");
    if (!SALLES[salle] || !jourValide(jour)) return json(400, { ok: false, erreur: "Salle ou jour invalide." });
    try { return json(200, { ok: true, occupe: await occupation(salle, jour) }); }
    catch (e) { console.error(e.message); return json(502, { ok: false, erreur: "Impossible de lire les disponibilités pour le moment.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") }); }
  }
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });

  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.site_web) return json(200, { ok: true });
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 4000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant de valider." });
  if (tropDEnvois(req, 4)) return json(429, { ok: false, erreur: "Trop de réservations envoyées. Réessayez dans quelques minutes." });

  const salle = Number(d.salle), s = SALLES[salle], jour = d.jour, heure = Number(d.heure), duree = Number(d.duree);
  const prenom = nettoie(d.prenom, 60), nomFamille = nettoie(d.nom, 60);
  const v = { nom: `${prenom} ${nomFamille}`.trim(), email: nettoie(d.email, 160).toLowerCase(), tel: nettoie(d.tel, 40), societe: nettoie(d.societe, 120),
    participants: Math.max(1, Math.min(20, Number(d.participants) || 1)), objet: nettoie(d.objet, 300) };
  if (!s || !jourValide(jour) || !Number.isInteger(heure) || ![1, 2, 3, 4].includes(duree)) return json(400, { ok: false, erreur: "Créneau invalide." });
  const h = HORAIRES[jourSemaine(jour)];
  if (!h || heure < h[0] || heure + duree > h[1]) return json(400, { ok: false, erreur: "Ce créneau est en dehors des horaires d'ouverture." });
  if (prenom.length < 1 || nomFamille.length < 1) return json(400, { ok: false, erreur: "Indiquez votre prénom et votre nom." });
  if (!emailValide(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." });
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter les conditions de réservation." });

  const de = parisVersUtc(jour, heure), a = parisVersUtc(jour, heure + duree);
  if (de < new Date(Date.now() + 15 * 60e3) || de > new Date(Date.now() + 90 * 864e5)) return json(400, { ok: false, erreur: "Choisissez un créneau à venir." });

  try {
    const pris = await occupation(salle, jour);
    if (pris.some(b => new Date(b.a) > de && new Date(b.de) < a)) return json(409, { ok: false, erreur: "Ce créneau vient d'être réservé. Choisissez-en un autre.", occupe: pris });
    const c = await contact({ ...v, note: "Contact créé depuis le site vitrine (réservation de salle)." });
    const produits = (Array.isArray(d.produits) ? d.produits : [])
      .map(x => ({ id: Number(x && x.id), q: Math.max(0, Math.min(50, Math.round(Number(x && x.q) || 0))) }))
      .filter(x => PRODUITS_RESA[x.id] && x.q > 0)
      .filter((x, i, t) => t.findIndex(y => y.id === x.id) === i);
    const montantSalle = s.prixHeure * duree;
    const montantProduits = produits.reduce((t, x) => t + PRODUITS_RESA[x.id].prix * x.q, 0);
    const montant = montantSalle + montantProduits;
    const lignes = produits.map(x => `${PRODUITS_RESA[x.id].nom} × ${x.q}`).join(", ");
    const b = await nx("POST", "/spaces/bookings", {
      ResourceId: salle, CoworkerId: c.id, FromTime: isoZ(de), ToTime: isoZ(a), Repeats: 2, WhichBookingsToUpdate: 1,
      // Créée « à confirmer » : Nexudus refuse (erreur 500) une réservation confirmée d'emblée via l'API pour ce compte.
      ChargeNow: false, InvoiceNow: false, Tentative: true,
      // Nexudus refuse la création (erreur 500 générique) si ces champs ne sont pas envoyés explicitement.
      InvoiceThisCoworker: false, DoNotUseBookingCredit: false, RepeatBooking: false, OverridePrice: 0, IncludeZoomInvite: false,
      // InternalNotes n'est pas enregistré à la création : le détail passe dans Notes.
      BookingProducts: produits.map(x => ({ ProductId: x.id, Quantity: x.q, InvoiceInMinutes: false })),
      Notes: [v.objet, `Réservé depuis le site vitrine · paiement de démonstration de ${montant} € HT`, lignes && `Services : ${lignes}`, `${v.participants} participant(s)`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join(" · "),
      InternalNotes: [`Réservation depuis le site vitrine · paiement simulé (démo) de ${montant} € HT`, `${v.participants} participant(s)`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`].filter(Boolean).join(" · "),
    });
    const id = b.Value && b.Value.Id;
    return json(200, { ok: true, montantHt: montant, reservation: id, reference: id ? "BDL-" + String(id).slice(-6) : null, nouveau: c.nouveau });
  } catch (e) {
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "La réservation n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.", detail: String(e.message || "").slice(0, 300) + (e.details ? " " + JSON.stringify(e.details).slice(0, 300) : "") });
  }
};

export default bilingue(traiter);

export const config = { path: "/api/salles" };

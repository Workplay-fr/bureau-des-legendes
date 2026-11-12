// Outils partagés par les fonctions Netlify : appel à l'API Nexudus, heure de Paris, contacts, salles.
export const API = "https://spaces.nexudus.com/api";
export const CFG = {
  business: Number(process.env.NEXUDUS_BUSINESS_ID || 1420978704),
  colonne: Number(process.env.NEXUDUS_CRM_COLUMN_ID || 1415241903), // Sales Pipeline · Demande de visite en ligne
  pays: Number(process.env.NEXUDUS_COUNTRY_ID || 1072),              // France
  fuseau: Number(process.env.NEXUDUS_TIMEZONE_ID || 2024),           // Paris
};

// Salles de réunion réservables depuis le site (identifiants Nexudus) et tarif horaire HT des rates Nexudus.
export const SALLES = {
  1415233614: { nom: "Salle des Légendes", prixHeure: 175 },
  1415233716: { nom: "Salle Jason Bourne", prixHeure: 175 },
  1415233715: { nom: "Salle Ethan Hunt", prixHeure: 175 },
  1415233717: { nom: "Salle James Bond", prixHeure: 35 },
};
// Horaires d'ouverture, heure de Paris : [ouverture, fermeture] par jour (0 = dimanche).
export const HORAIRES = { 0: null, 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [9, 18] };

export const vide = () => !process.env.NEXUDUS_USER || !process.env.NEXUDUS_PASSWORD;

export async function nx(method, path, body) {
  const auth = "Basic " + Buffer.from(`${process.env.NEXUDUS_USER}:${process.env.NEXUDUS_PASSWORD}`).toString("base64");
  const r = await fetch(API + path, {
    method,
    headers: { authorization: auth, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t.slice(0, 300) }; }
  if (!r.ok || d.WasSuccessful === false) {
    const e = new Error(`Nexudus ${method} ${path.split("?")[0]} → ${r.status} ${d.Message || d.raw || ""}`);
    e.status = r.status; e.details = d.Errors; throw e;
  }
  return d;
}

// Décalage de Paris par rapport à UTC (en minutes) à un instant donné.
function decalageParis(date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
  const g = t => Number(p.find(x => x.type === t).value);
  return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - date.getTime()) / 60000;
}
// "2026-11-12", 14 → instant UTC correspondant à 14 h à Paris ce jour-là.
export function parisVersUtc(jour, heure, minute = 0) {
  const [y, m, d] = jour.split("-").map(Number);
  const naif = Date.UTC(y, m - 1, d, heure, minute);
  return new Date(naif - decalageParis(new Date(naif)) * 60000);
}
export const jourSemaine = jour => { const [y, m, d] = jour.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const isoZ = d => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const utc = s => new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");

// Créneaux déjà pris pour une salle un jour donné (heure de Paris) : [{de, a}] en ISO UTC.
export async function occupation(salle, jour) {
  const debut = parisVersUtc(jour, 0), fin = parisVersUtc(jour, 23, 59);
  const depuis = new Date(debut.getTime() - 24 * 3600e3);
  const q = `Booking_Resource=${salle}&from_Booking_FromTime=${encodeURIComponent(isoZ(depuis))}&to_Booking_FromTime=${encodeURIComponent(isoZ(fin))}&size=100`;
  const d = await nx("GET", `/spaces/bookings?${q}`);
  return (d.Records || [])
    .map(b => ({ de: utc(b.FromTime), a: utc(b.ToTime) }))
    .filter(b => b.a > debut && b.de < fin)
    .map(b => ({ de: isoZ(b.de), a: isoZ(b.a) }));
}

// Postes flexibles du 1er étage (ressources Nexudus « Poste C01 » à « Poste C20 »), dans l'ordre du plan.
const IDS_POSTES = [1415423097,1415423001,1415423002,1415423098,1415423099,1415423003,1415423004,1415423005,1415423100,1415423101,1415423006,1415423102,1415423007,1415423103,1415423104,1415423105,1415423106,1415423107,1415423008,1415423009];
const ZONES_POSTES = ["fenetre","debout","fenetre","ecran","calme"];
export const POSTES = Object.fromEntries(IDS_POSTES.map((id, i) => [id, { nom: "Poste C" + String(i + 1).padStart(2, "0"), zone: ZONES_POSTES[Math.floor(i / 4)] }]));
// Tarifs HT d'un poste flexible réservé depuis le site.
export const TARIFS_POSTE = { matin: 15, apres: 15, journee: 25 };
// Créneaux d'un poste, heure de Paris, selon les horaires du jour.
export function creneauPoste(jour, creneau) {
  const h = HORAIRES[jourSemaine(jour)];
  if (!h) return null;
  if (creneau === "matin") return [h[0], 13];
  if (creneau === "apres") return [13, h[1]];
  if (creneau === "journee") return [h[0], h[1]];
  return null;
}
// Réservations de tous les postes un jour donné : { idPoste: [{de, a}] } en ISO UTC.
export async function occupationPostes(jour) {
  const debut = parisVersUtc(jour, 0), fin = parisVersUtc(jour, 23, 59);
  const depuis = new Date(debut.getTime() - 24 * 3600e3);
  const res = Object.fromEntries(Object.keys(POSTES).map(id => [id, []]));
  for (let page = 1; page <= 5; page++) {
    const q = `from_Booking_FromTime=${encodeURIComponent(isoZ(depuis))}&to_Booking_FromTime=${encodeURIComponent(isoZ(fin))}&size=100&page=${page}`;
    const d = await nx("GET", `/spaces/bookings?${q}`);
    for (const b of d.Records || []) {
      const id = String(b.ResourceId || (b.Resource && b.Resource.Id) || "");
      if (!res[id]) continue;
      const de = utc(b.FromTime), a = utc(b.ToTime);
      if (a > debut && de < fin) res[id].push({ de: isoZ(de), a: isoZ(a) });
    }
    if (!d.HasNextPage) break;
  }
  return res;
}

// Retrouve un contact par e-mail, ou le crée.
export async function contact({ nom, email, tel, societe, note, compte }) {
  const liste = await nx("GET", `/spaces/coworkers?Coworker_Email=${encodeURIComponent(email)}&size=1`);
  const existant = liste.Records && liste.Records[0] && liste.Records[0].Id;
  if (existant) return { id: existant, nouveau: false, compte: !!liste.Records[0].UserId };
  const fiche = {
    CoworkerType: 1, FullName: nom, Email: email, MobilePhone: tel || null, CompanyName: societe || null,
    Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
    MondayAttendance: 1, TuesdayAttendance: 1, WednesdayAttendance: 1, ThursdayAttendance: 1, FridayAttendance: 1, SaturdayAttendance: 1, SundayAttendance: 1,
    Notes: note || "Contact créé depuis le site vitrine.",
  };
  let c, avecCompte = !!compte;
  try { c = await nx("POST", "/spaces/coworkers", compte ? { ...fiche, CreateUser: true } : fiche); }
  catch (e) {
    if (!compte) throw e;
    // Si la création du compte portail est refusée, on crée au moins la fiche.
    console.error("CreateUser refusé, fiche sans compte :", e.message);
    c = await nx("POST", "/spaces/coworkers", fiche); avecCompte = false;
  }
  const id = c.Value && c.Value.Id;
  if (!id) throw new Error("Nexudus n'a pas renvoyé l'identifiant du contact.");
  return { id, nouveau: true, compte: avecCompte };
}

// Services proposés avec une réservation de salle (produits Nexudus, prix HT). parPersonne : quantité = nombre de participants par défaut.
export const PRODUITS_RESA = {
  1415347146: { nom: "Petit-déjeuner", prix: 7, parPersonne: true },
  1415523484: { nom: "Pause gourmande", prix: 9, parPersonne: true },
  1415347147: { nom: "Plateau repas", prix: 29, parPersonne: true },
  1415458044: { nom: "Plateau boissons", prix: 18, parPersonne: false },
  1415523387: { nom: "Kit visioconférence", prix: 15, parPersonne: false },
  1415523388: { nom: "Paperboard & fournitures", prix: 8, parPersonne: false },
};

// Formules proposées à l'adhésion depuis le site (identifiants et prix mensuels HT Nexudus).
export const FORMULES_NX = {
  1415397038: { nom: "Nomade", prix: 290, quantite: false },
  1415397039: { nom: "Résident", prix: 490, quantite: false },
  1415397447: { nom: "Bureau privé", prix: 750, quantite: true },
  1415397040: { nom: "Domiciliation", prix: 90, quantite: false },
};

// Utilitaires HTTP.
export const nettoie = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
export const emailValide = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": process.env.ALLOWED_ORIGIN || "*", "cache-control": "no-store" },
});
const vus = new Map();
export function tropDEnvois(req, max = 5) {
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?";
  const now = Date.now(), fen = 10 * 60 * 1000;
  const l = (vus.get(ip) || []).filter(t => now - t < fen); l.push(now); vus.set(ip, l);
  return l.length > max;
}

// Messages d'erreur en anglais pour la version anglaise du site (lang=en dans l'adresse ou dans la demande).
const EN = {
  "Ce créneau est en dehors des horaires d'ouverture.": "This slot is outside opening hours.",
  "Ce créneau vient d'être réservé. Choisissez-en un autre.": "This slot has just been booked. Please choose another.",
  "Cette adresse e-mail n'est pas valide.": "This email address is not valid.",
  "Choisissez un créneau à venir.": "Please choose an upcoming slot.",
  "Choisissez une date de début.": "Please choose a start date.",
  "Choisissez une date de visite.": "Please choose a visit date.",
  "Choisissez une formule.": "Please choose a membership.",
  "Créneau invalide.": "Invalid slot.",
  "Demande illisible.": "Unreadable request.",
  "Impossible de lire les disponibilités pour le moment.": "Availability cannot be read at the moment.",
  "Indiquez votre nom.": "Please enter your name.",
  "Indiquez votre prénom et votre nom.": "Please enter your first and last name.",
  "Jour invalide.": "Invalid day.",
  "L'adhésion n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.": "The membership could not be recorded. Please try again or call us on +33 1 84 80 12 34.",
  "La réservation n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.": "The booking could not be recorded. Please try again or call us on +33 1 84 80 12 34.",
  "Le Bureau est fermé ce jour-là.": "The Bureau is closed that day.",
  "Le site n'est pas encore relié à Nexudus.": "The site is not connected to Nexudus yet.",
  "Merci d'accepter d'être recontacté.": "Please agree to be contacted.",
  "Merci d'accepter les conditions d'adhésion.": "Please accept the membership terms.",
  "Merci d'accepter les conditions de réservation.": "Please accept the booking terms.",
  "Merci de patienter quelques secondes avant d'envoyer.": "Please wait a few seconds before sending.",
  "Merci de patienter quelques secondes avant de valider.": "Please wait a few seconds before confirming.",
  "Méthode non autorisée.": "Method not allowed.",
  "Poste ou créneau invalide.": "Invalid desk or slot.",
  "Salle ou jour invalide.": "Invalid room or day.",
  "Trop d'adhésions envoyées. Réessayez dans quelques minutes.": "Too many sign-ups. Please try again in a few minutes.",
  "Trop de demandes envoyées. Réessayez dans quelques minutes.": "Too many requests. Please try again in a few minutes.",
  "Trop de réservations envoyées. Réessayez dans quelques minutes.": "Too many bookings. Please try again in a few minutes.",
  "Votre demande n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34.": "Your request could not be recorded. Please try again or call us on +33 1 84 80 12 34.",
};
const enAnglais = m => EN[m] || String(m).replace(/^Poste (C\d+) vient d'être réservé sur ce créneau\. Choisissez un autre poste\.$/, "Desk $1 has just been booked for this slot. Please choose another desk.");
// Enveloppe une fonction : si la page est en anglais, le champ « erreur » de la réponse est traduit.
export const bilingue = traiter => async req => {
  let lang = new URL(req.url).searchParams.get("lang");
  if (!lang && req.method === "POST") { try { lang = (await req.clone().json()).lang; } catch { /* corps illisible : la fonction répondra */ } }
  const r = await traiter(req);
  if (lang !== "en") return r;
  let d; try { d = await r.clone().json(); } catch { return r; }
  if (!d || !d.erreur) return r;
  return new Response(JSON.stringify({ ...d, erreur: enAnglais(d.erreur) }), { status: r.status, headers: r.headers });
};

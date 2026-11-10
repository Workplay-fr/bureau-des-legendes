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

// Retrouve un contact par e-mail, ou le crée.
export async function contact({ nom, email, tel, societe, note }) {
  const liste = await nx("GET", `/spaces/coworkers?Coworker_Email=${encodeURIComponent(email)}&size=1`);
  const existant = liste.Records && liste.Records[0] && liste.Records[0].Id;
  if (existant) return { id: existant, nouveau: false };
  const c = await nx("POST", "/spaces/coworkers", {
    CoworkerType: 1, FullName: nom, Email: email, MobilePhone: tel || null, CompanyName: societe || null,
    Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
    MondayAttendance: 1, TuesdayAttendance: 1, WednesdayAttendance: 1, ThursdayAttendance: 1, FridayAttendance: 1, SaturdayAttendance: 1, SundayAttendance: 1,
    Notes: note || "Contact créé depuis le site vitrine.",
  });
  const id = c.Value && c.Value.Id;
  if (!id) throw new Error("Nexudus n'a pas renvoyé l'identifiant du contact.");
  return { id, nouveau: true };
}

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

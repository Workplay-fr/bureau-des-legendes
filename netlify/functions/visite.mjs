// Reçoit le formulaire « Réserver une visite » et l'enregistre dans le CRM Nexudus.
// Les accès Nexudus restent côté serveur, dans les variables d'environnement Netlify :
//   NEXUDUS_USER, NEXUDUS_PASSWORD  (utilisateur API dédié, sans double authentification)
// Optionnelles (valeurs du Bureau des Légendes Paris par défaut) :
//   NEXUDUS_BUSINESS_ID, NEXUDUS_CRM_COLUMN_ID, NEXUDUS_COUNTRY_ID, NEXUDUS_TIMEZONE_ID, ALLOWED_ORIGIN

const API = "https://spaces.nexudus.com/api";
const CFG = {
  business: Number(process.env.NEXUDUS_BUSINESS_ID || 1420978704),
  colonne: Number(process.env.NEXUDUS_CRM_COLUMN_ID || 1415241903), // Sales Pipeline · Demande de visite en ligne
  pays: Number(process.env.NEXUDUS_COUNTRY_ID || 1072),              // France
  fuseau: Number(process.env.NEXUDUS_TIMEZONE_ID || 2024),           // Paris
};
const FORMULES = { "Nomade": 290, "Résident": 490, "Bureau privé": 750, "Domiciliation": 90, "À définir": null };
const EQUIPES = ["Seul·e", "2 à 5 personnes", "6 personnes et plus"];

// Limite simple par adresse IP (par instance) : 5 demandes par 10 minutes.
const vus = new Map();
function tropDEnvois(ip) {
  const now = Date.now(), fen = 10 * 60 * 1000;
  const l = (vus.get(ip) || []).filter(t => now - t < fen);
  l.push(now); vus.set(ip, l);
  return l.length > 5;
}

const json = (status, body, origin) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": origin || "*", "cache-control": "no-store" },
});

async function nx(method, path, body) {
  const auth = "Basic " + Buffer.from(`${process.env.NEXUDUS_USER}:${process.env.NEXUDUS_PASSWORD}`).toString("base64");
  const r = await fetch(API + path, {
    method,
    headers: { authorization: auth, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t.slice(0, 300) }; }
  if (!r.ok || d.WasSuccessful === false) {
    const e = new Error(`Nexudus ${method} ${path} → ${r.status} ${d.Message || d.raw || ""}`);
    e.status = r.status; e.details = d.Errors; throw e;
  }
  return d;
}

const nettoie = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export default async (req) => {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": origin, "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" } });
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." }, origin);
  if (!process.env.NEXUDUS_USER || !process.env.NEXUDUS_PASSWORD) return json(500, { ok: false, erreur: "Le site n'est pas encore relié à Nexudus." }, origin);

  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }, origin); }

  // Anti-spam : champ piège invisible, formulaire rempli trop vite, trop d'envois.
  if (d.site_web) return json(200, { ok: true }, origin);
  if (!d.ouvert_le || Date.now() - Number(d.ouvert_le) < 3000) return json(429, { ok: false, erreur: "Merci de patienter quelques secondes avant d'envoyer." }, origin);
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?";
  if (tropDEnvois(ip)) return json(429, { ok: false, erreur: "Trop de demandes envoyées. Réessayez dans quelques minutes." }, origin);

  const v = {
    nom: nettoie(d.nom, 120), email: nettoie(d.email, 160).toLowerCase(), tel: nettoie(d.tel, 40), societe: nettoie(d.societe, 120),
    message: nettoie(d.message, 1500), formule: Object.hasOwn(FORMULES, d.formule) ? d.formule : "À définir",
    equipe: EQUIPES.includes(d.equipe) ? d.equipe : EQUIPES[0], quand: new Date(d.quand), quandTxt: nettoie(d.quandTxt, 80),
  };
  if (v.nom.length < 2) return json(400, { ok: false, erreur: "Indiquez votre nom." }, origin);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return json(400, { ok: false, erreur: "Cette adresse e-mail n'est pas valide." }, origin);
  if (isNaN(v.quand) || v.quand < Date.now() - 864e5 || v.quand > Date.now() + 90 * 864e5) return json(400, { ok: false, erreur: "Choisissez une date de visite." }, origin);
  if (!d.accord) return json(400, { ok: false, erreur: "Merci d'accepter d'être recontacté." }, origin);

  try {
    const liste = await nx("GET", `/spaces/coworkers?Coworker_Email=${encodeURIComponent(v.email)}&size=1`);
    let client = liste.Records && liste.Records[0] && liste.Records[0].Id, nouveau = !client;
    if (!client) {
      const c = await nx("POST", "/spaces/coworkers", {
        CoworkerType: 1, FullName: v.nom, Email: v.email, MobilePhone: v.tel || null, CompanyName: v.societe || null,
        Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
        MondayAttendance: 1, TuesdayAttendance: 1, WednesdayAttendance: 1, ThursdayAttendance: 1, FridayAttendance: 1, SaturdayAttendance: 1, SundayAttendance: 1,
        Notes: "Contact créé depuis le site vitrine (demande de visite).",
      });
      client = c.Value && c.Value.Id;
      if (!client) throw new Error("Nexudus n'a pas renvoyé l'identifiant du contact.");
    }
    const notes = [`Visite souhaitée : ${v.quandTxt}`, `Intérêt : ${v.formule}`, `Équipe : ${v.equipe}`, v.societe && `Société : ${v.societe}`, v.tel && `Téléphone : ${v.tel}`, v.message && `Message : ${v.message}`].filter(Boolean).join("\n");
    await nx("POST", "/crm/crmopportunities", {
      Name: `Visite · ${v.nom}`, CrmBoardColumnId: CFG.colonne, CoworkerId: client, Status: 1, Position: 0, LeadSource: 1,
      DueDate: v.quand.toISOString().replace(/\.\d{3}Z$/, "Z"), Value: FORMULES[v.formule], Notes: notes,
      UtmSource: nettoie(d.utm_source, 80) || "site-vitrine", UtmMedium: nettoie(d.utm_medium, 80) || "formulaire-visite", UtmCampaign: nettoie(d.utm_campaign, 80) || null,
    });
    return json(200, { ok: true, nouveau }, origin);
  } catch (e) {
    console.error(e.message, JSON.stringify(e.details || null));
    return json(502, { ok: false, erreur: "Votre demande n'a pas pu être enregistrée. Réessayez ou appelez-nous au +33 1 84 80 12 34." }, origin);
  }
};

export const config = { path: "/api/visite" };

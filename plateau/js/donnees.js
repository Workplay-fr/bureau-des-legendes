// Couche de données : disponibilités, prix et réservation.
// Deux adaptateurs à la même interface :
//   - Nexudus : passe par la fonction serveur /api/postes (identifiants et appels privilégiés restent côté serveur,
//     qui revérifie la disponibilité et le prix avant de créer la réservation) ;
//   - simulé : utilisé seulement quand /api/postes ne répond pas (aperçu hors ligne). Rien n'est enregistré,
//     et l'interface l'affiche clairement.
import { POSTES_PLAN } from "./plan.js";

const lireJson = async r => { try { return await r.json(); } catch { return null; } };

const nexudus = {
  source: "nexudus",
  async etat(jour, semaines = 0, jsem = [1, 2, 3, 4, 5]) {
    const r = await fetch(`/api/postes?jour=${jour}${semaines ? `&semaines=${semaines}&jsem=${jsem.join(",")}` : ""}`, { headers: { accept: "application/json" } });
    const d = await lireJson(r);
    if (!d) throw Object.assign(new Error("hors-ligne"), { code: "hors-ligne" });
    if (!r.ok || !d.ok) throw Object.assign(new Error(d.erreur || "Disponibilités indisponibles pour le moment."), { code: "serveur" });
    return d;
  },
  async reserver(v) {
    const r = await fetch("/api/postes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
    const d = await lireJson(r) || {};
    if (r.status === 409) throw Object.assign(new Error(d.erreur || "Ce poste vient d'être réservé."), { code: "conflit", etat: d.postes ? d : null });
    if (!r.ok || !d.ok) throw Object.assign(new Error(d.erreur || "La réservation n'a pas pu être enregistrée."), { code: "serveur" });
    return { ...d, simule: false };
  },
};

// Données simulées : occupation tirée d'une graine stable par jour, pour que l'aperçu reste cohérent.
const prises = new Set();
function alea(graine) { let h = 2166136261; for (const c of graine) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }
const simule = {
  source: "simule",
  async etat(jour, semaines = 0, jsem = [1, 2, 3, 4, 5]) {
    await new Promise(r => setTimeout(r, 350));
    const horaires = j => { const w = new Date(j + "T12:00:00Z").getUTCDay(); return w === 0 ? null : w === 6 ? [9, 18] : [8, 20]; };
    // Mêmes règles que le serveur : un jour, ou les jours ouverts de la période qui tombent sur les jours de semaine choisis.
    const jours = []; if (!semaines) jours.push(jour); else { const c = new Date(jour + "T12:00:00Z"); for (let k = 0; k < semaines * 7; k++, c.setUTCDate(c.getUTCDate() + 1)) { const v = c.toISOString().slice(0, 10); if (jsem.includes(c.getUTCDay()) && horaires(v)) jours.push(v); } }
    const h = jours.length ? horaires(jours[0]) : null, n = jours.length;
    const creneaux = h ? { matin: { de: h[0], a: 13, prix: 15 * n, parJour: 15 }, apres: { de: 13, a: h[1], prix: 15 * n, parJour: 15 }, journee: { de: h[0], a: h[1], prix: 25 * n, parJour: 25 } } : { matin: null, apres: null, journee: null };
    const postes = POSTES_PLAN.map((p, i) => {
      const m = jours.some(j => alea(j + p.code + "m") < 0.38 / Math.sqrt(n) || prises.has(`${j}|${p.code}|matin`) || prises.has(`${j}|${p.code}|journee`));
      const a = jours.some(j => alea(j + p.code + "a") < 0.3 / Math.sqrt(n) || prises.has(`${j}|${p.code}|apres`) || prises.has(`${j}|${p.code}|journee`));
      const e = h ? { matin: m ? "pris" : "libre", apres: a ? "pris" : "libre", journee: m || a ? "pris" : "libre" } : { matin: "passe", apres: "passe", journee: "passe" };
      return { id: 1000 + i, nom: "Poste " + p.code, zone: p.zone, etat: e }; // même nom que les ressources Nexudus
    });
    return { ok: true, source: "simule", jour, jours, nbJours: n, ouvert: !!h, creneaux, postes };
  },
  async reserver(v) {
    await new Promise(r => setTimeout(r, 900));
    const p = POSTES_PLAN[v.poste - 1000];
    if (!p) throw Object.assign(new Error("Poste inconnu."), { code: "serveur" });
    prises.add(`${v.jour}|${p.code}|${v.creneau}`);
    return { ok: true, simule: true, reference: null };
  },
};

// Choisit l'adaptateur au premier appel : Nexudus si la fonction serveur répond, sinon le simulé.
let actif = null;
export const donnees = {
  get source() { return actif ? actif.source : null; },
  async etat(jour, semaines, jsem) {
    if (actif) return actif.etat(jour, semaines, jsem);
    try { const d = await nexudus.etat(jour, semaines, jsem); actif = nexudus; return d; }
    catch (e) {
      if (e.code !== "hors-ligne" && !(e instanceof TypeError)) { actif = nexudus; throw e; }
      actif = simule; return simule.etat(jour, semaines, jsem);
    }
  },
  reserver(v) { return (actif || nexudus).reserver(v); },
};

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
  async etat(jour) {
    const r = await fetch(`/api/postes?jour=${jour}`, { headers: { accept: "application/json" } });
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
  async etat(jour) {
    await new Promise(r => setTimeout(r, 350));
    const w = new Date(jour + "T12:00:00Z").getUTCDay();
    const h = w === 0 ? null : w === 6 ? [9, 18] : [8, 20];
    const creneaux = h ? { matin: { de: h[0], a: 13, prix: 15 }, apres: { de: 13, a: h[1], prix: 15 }, journee: { de: h[0], a: h[1], prix: 25 } } : { matin: null, apres: null, journee: null };
    const postes = POSTES_PLAN.map((p, i) => {
      const m = alea(jour + p.code + "m") < 0.38 || prises.has(`${jour}|${p.code}|matin`) || prises.has(`${jour}|${p.code}|journee`);
      const a = alea(jour + p.code + "a") < 0.3 || prises.has(`${jour}|${p.code}|apres`) || prises.has(`${jour}|${p.code}|journee`);
      const e = h ? { matin: m ? "pris" : "libre", apres: a ? "pris" : "libre", journee: m || a ? "pris" : "libre" } : { matin: "passe", apres: "passe", journee: "passe" };
      return { id: 1000 + i, nom: "Poste " + p.code, zone: p.zone, etat: e }; // même nom que les ressources Nexudus
    });
    return { ok: true, source: "simule", jour, ouvert: !!h, creneaux, postes };
  },
  async reserver(v) {
    await new Promise(r => setTimeout(r, 900));
    const p = POSTES_PLAN[v.poste - 1000];
    if (!p) throw Object.assign(new Error("Poste inconnu."), { code: "serveur" });
    prises.add(`${v.jour}|${p.code}|${v.creneau}`);
    return { ok: true, simule: true, reference: null, montantHt: { matin: 15, apres: 15, journee: 25 }[v.creneau] };
  },
};

// Choisit l'adaptateur au premier appel : Nexudus si la fonction serveur répond, sinon le simulé.
let actif = null;
export const donnees = {
  get source() { return actif ? actif.source : null; },
  async etat(jour) {
    if (actif) return actif.etat(jour);
    try { const d = await nexudus.etat(jour); actif = nexudus; return d; }
    catch (e) {
      if (e.code !== "hors-ligne" && !(e instanceof TypeError)) { actif = nexudus; throw e; }
      actif = simule; return simule.etat(jour);
    }
  },
  reserver(v) { return (actif || nexudus).reserver(v); },
};

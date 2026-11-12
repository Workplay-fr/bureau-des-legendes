// Interface du plateau : date, créneau, filtres, repères, fiche du poste et réservation.
import { POSTES_PLAN, ZONES } from "./plan.js";
import { donnees } from "./donnees.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const CRENEAUX = { matin: "Matin", apres: "Après-midi", journee: "Journée" };
const jourParis = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
const jourLong = j => new Date(j + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const E = { jour: null, creneau: "journee", zone: null, etat: null, charge: false, erreur: null, choix: null, etape: 1, envoi: false, ouvertLe: 0, fin: null, survol: null, form: {} };
let scene = null;
const parCode = Object.fromEntries(POSTES_PLAN.map(p => [p.code, p]));
const codeDe = nom => String(nom || "").replace(/^Poste\s+/i, "");
const posteApi = code => E.etat && E.etat.postes.find(p => codeDe(p.nom) === code);
const etatDe = (code, c = E.creneau) => { const p = posteApi(code); return p ? p.etat[c] : E.erreur ? "passe" : "attente"; };
const libelleEtat = e => ({ libre: "Libre", pris: "Occupé", passe: "Indisponible", attente: "…" }[e] || "");
const heures = c => { const h = E.etat && E.etat.creneaux[c]; return h ? `${h.de} h – ${h.a} h` : ""; };
const prix = c => { const h = E.etat && E.etat.creneaux[c]; return h ? h.prix : null; };

/* ---------- Barre : jours, créneaux, zones ---------- */
function puces(box, items, valeur, choisir) {
  box.innerHTML = items.map(i => `<button class="puce" type="button" role="radio" aria-checked="${i.v === valeur}" data-v="${esc(i.v ?? "")}">${i.petit ? `<small>${esc(i.petit)}</small>` : ""}${esc(i.t)}</button>`).join("");
  box.onclick = e => { const b = e.target.closest(".puce"); if (b) choisir(b.dataset.v || null); };
  box.onkeydown = e => { if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return; const bs = [...box.querySelectorAll(".puce")], i = bs.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click(); };
}
function dessinerBarre() {
  const auj = jourParis(new Date()), [y, m, d] = auj.split("-").map(Number), c = new Date(Date.UTC(y, m - 1, d)), jours = [];
  const js = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."], ms = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  while (jours.length < 9) { const v = c.toISOString().slice(0, 10), w = c.getUTCDay(); if (w !== 0) jours.push({ v, petit: v === auj ? "auj." : js[w], t: `${c.getUTCDate()} ${ms[c.getUTCMonth()]}` }); c.setUTCDate(c.getUTCDate() + 1); }
  if (!E.jour) E.jour = jours[0].v;
  const garder = (box, f) => { const a = document.activeElement, v = a && box.contains(a) ? a.dataset.v : undefined; f(); if (v !== undefined) box.querySelector(`[data-v="${v}"]`)?.focus(); };
  garder($("jours"), () => puces($("jours"), jours, E.jour, v => { if (v === E.jour) return; E.jour = v; dessinerBarre(); chargerEtat(); }));
  garder($("creneaux"), () => puces($("creneaux"), Object.entries(CRENEAUX).map(([v, t]) => ({ v, t })), E.creneau, v => { E.creneau = v; dessinerBarre(); rafraichir(); }));
  garder($("zones"), () => puces($("zones"), [{ v: null, t: "Tous" }, ...Object.entries(ZONES).map(([v, z]) => ({ v, t: z.nom }))], E.zone, v => { E.zone = v; dessinerBarre(); if (scene) { v ? scene.cadrerZone(v) : scene.vueEnsemble(); } rafraichir(); }));
}

/* ---------- Données ---------- */
let jeton = 0;
async function chargerEtat() {
  const j = ++jeton; E.charge = true; E.erreur = null; rafraichir();
  try { const d = await donnees.etat(E.jour); if (j !== jeton) return; E.etat = d; }
  catch (e) { if (j !== jeton) return; E.etat = null; E.erreur = e.message || "Disponibilités indisponibles pour le moment."; }
  E.charge = false; rafraichir();
}

/* ---------- Repères sur la scène ---------- */
const reperes = {};
function creerReperes() {
  const box = $("reperes");
  for (const p of POSTES_PLAN) { const el = document.createElement("div"); el.className = "rep"; el.innerHTML = `<i></i><b></b>`; el.style.setProperty("--d", ((p.x + p.y * 0.6 - 560) / 1100 * 0.9).toFixed(2) + "s"); box.appendChild(el); reperes[p.code] = el; }
}
function placerReperes() {
  if (!scene) return;
  for (const code in reperes) { const q = scene.projeter(code), el = reperes[code]; el.style.transform = `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px) translate(-50%,-50%)`; el.classList.toggle("cache", !q.visible); }
  const loin = scene.loin();
  $("b-ensemble").hidden = loin && !E.choix && !E.zone;
}

/* ---------- Rendu de l'interface ---------- */
function rafraichir() {
  const etats = {};
  for (const p of POSTES_PLAN) {
    const e = etatDe(p.code), el = reperes[p.code]; etats[p.code] = e;
    if (el) { el.dataset.etat = e; el.classList.toggle("estompe", !!E.zone && p.zone !== E.zone); el.classList.toggle("choisi", E.choix === p.code); el.classList.toggle("survol", E.survol === p.code && E.choix !== p.code);
      el.lastElementChild.innerHTML = `${esc(p.nom)}<span>${esc(libelleEtat(e))}</span>`; }
  }
  if (scene) { scene.majEtats(etats); scene.ambiance(E.creneau); }
  for (const c in reperes) reperes[c].classList.toggle("scelle", !!E.fin && E.choix === c);
  // compteur
  const visibles = POSTES_PLAN.filter(p => !E.zone || p.zone === E.zone), libres = visibles.filter(p => etats[p.code] === "libre").length;
  const avant = Number($("compte").querySelector("b")?.dataset.n);
  $("compte").innerHTML = E.charge && !E.etat ? "Lecture des disponibilités…" : E.erreur ? "" : `<b data-n="${libres}">${libres}</b> ${libres > 1 ? "postes libres" : "poste libre"} sur ${visibles.length} · ${esc(jourLong(E.jour))} · ${esc(CRENEAUX[E.creneau].toLowerCase())}`;
  compter($("compte").querySelector("b"), avant, libres);
  // bandeau : erreur ou données simulées
  const b = $("bandeau");
  if (E.erreur) { b.hidden = false; b.className = "bandeau"; b.innerHTML = `${esc(E.erreur)}<button type="button" id="reessayer">Réessayer</button>`; $("reessayer").onclick = chargerEtat; }
  else if (donnees.source === "simule") { b.hidden = false; b.className = "bandeau info"; b.textContent = "Aperçu hors ligne : les disponibilités sont simulées et aucune réservation n'est enregistrée."; }
  else b.hidden = true;
  if (E.zone || E.choix) $("aide").classList.add("vu");
  dessinerListe(); if (E.choix) dessinerFiche();
}

// Le nombre de postes libres défile jusqu'à sa nouvelle valeur
function compter(el, de, a) { if (!el || !Number.isFinite(de) || de === a || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const t0 = performance.now(), duree = 700; el.textContent = de; el.classList.add("change");
  const pas = now => { const k = Math.min(1, (now - t0) / duree); if (!el.isConnected) return; el.textContent = Math.round(de + (a - de) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas); else el.classList.remove("change"); }; requestAnimationFrame(pas); }
function dessinerListe() {
  const box = $("liste-corps"); if ($("liste").hidden && !document.body.classList.contains("sans-3d")) return;
  const actif = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.code : null;
  box.innerHTML = Object.entries(ZONES).filter(([z]) => !E.zone || z === E.zone).map(([z, info]) => `<h3>${esc(info.nom)}</h3>` + POSTES_PLAN.filter(p => p.zone === z).map(p => { const e = etatDe(p.code), px = prix(E.creneau);
    return `<button class="ligne" type="button" data-code="${p.code}">${esc(p.nom)}<span><i class="pt ${e === "libre" ? "" : "pris"}"></i>${esc(libelleEtat(e))}${e === "libre" && px ? " · " + eur(px) + " HT" : ""}</span></button>`; }).join("")).join("");
  if (actif) box.querySelector(`[data-code="${actif}"]`)?.focus();
}

/* ---------- Fiche et réservation ---------- */
function choisir(code, o = {}) {
  if (E.envoi) return;
  if (code !== E.choix) { E.etape = 1; E.fin = null; E.msg = null; }
  E.choix = code; const f = $("fiche");
  document.body.classList.toggle("fiche-ouverte", !!code);
  if (!code) { f.hidden = true; scene && scene.choisir(null); cadrer(); rafraichir(); return; }
  if (f.hidden) { f.hidden = false; E.ouvertLe = Date.now(); }
  cadrer(); scene && scene.choisir(code, o); rafraichir();
  if (o.focus) $("f-corps").querySelector("button,input")?.focus();
}
function cadrer() { if (!scene) return; const etroit = matchMedia("(max-width:820px)").matches, f = $("fiche"); if (!E.choix) return scene.decaler(0, 0); etroit ? scene.decaler(0, f.offsetHeight / 2) : scene.decaler(f.offsetWidth / 2, 0); }

function dessinerFiche() {
  const p = parCode[E.choix], z = ZONES[p.zone], box = $("f-corps"), e = etatDe(p.code), px = prix(E.creneau);
  const tete = `<div><span class="label">Poste flexible · ${esc(z.nom)}</span><h2 id="f-nom">${esc(p.nom)}</h2></div>`;
  if (E.fin) {
    const r = E.fin;
    box.innerHTML = `${tete}
      <svg class="sceau" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="36"/><path d="M25 39l9 9 17-19"/></svg>
      <p style="font-size:17px">${r.simule ? "Réservation simulée." : `C'est noté, ${esc(r.prenom)}.`}</p>
      <p class="texte">${r.simule ? "Cet aperçu fonctionne hors ligne : <b>rien n'a été enregistré</b> dans Nexudus et aucun poste n'est réellement réservé." : `Votre poste est bloqué à votre nom. La réservation est enregistrée dans Nexudus, en attente de confirmation par l'équipe. Un e-mail vous sera envoyé à ${esc(r.email)}.`}</p>
      <ul class="recap"><li><span>Poste</span>${esc(p.nom)} · ${esc(z.nom)}</li><li><span>Quand</span>${esc(jourLong(r.jour))}<br>${esc(CRENEAUX[r.creneau])} · ${esc(r.heures)}</li><li><span>Montant</span>${eur(r.ttc)} TTC${r.simule ? "" : " (paiement de démonstration)"}</li>${r.reference ? `<li><span>Référence</span>${esc(r.reference)}</li>` : ""}</ul>
      <button class="btn" type="button" data-act="fermer" style="margin-top:auto">Retour au plateau</button>`;
    return;
  }
  if (E.etape === 2) {
    const v = E.form;
    box.innerHTML = `${tete}
      <p class="etat"><i class="pt"></i>${esc(jourLong(E.jour))} · ${esc(CRENEAUX[E.creneau].toLowerCase())} · ${esc(heures(E.creneau))}</p>
      <form id="f-form" novalidate style="display:flex;flex-direction:column;gap:16px;flex:1">
        <div class="champs">
          <div class="champ"><label for="f-prenom">Prénom</label><input id="f-prenom" name="prenom" autocomplete="given-name" value="${esc(v.prenom)}"><span class="msg"></span></div>
          <div class="champ"><label for="f-nomf">Nom</label><input id="f-nomf" name="nom" autocomplete="family-name" value="${esc(v.nom)}"><span class="msg"></span></div>
          <div class="champ large"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="email" value="${esc(v.email)}"><span class="msg"></span></div>
          <div class="champ large"><label for="f-societe">Entreprise (facultatif)</label><input id="f-societe" name="societe" autocomplete="organization" value="${esc(v.societe)}"><span class="msg"></span></div>
        </div>
        <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label for="f-site">Site web</label><input id="f-site" name="site_web" tabindex="-1" autocomplete="off"></div>
        <label class="accord"><input type="checkbox" name="accord" ${v.accord ? "checked" : ""}> J'accepte les conditions de réservation : annulation gratuite jusqu'à la veille.</label>
        <p class="note"><span aria-hidden="true">ⓘ</span><span>${donnees.source === "simule" ? "<b>Aperçu hors ligne :</b> la réservation sera simulée, rien ne sera enregistré." : "<b>Paiement de démonstration :</b> aucune carte n'est demandée. La réservation, elle, est bien enregistrée."}</span></p>
        ${E.msg ? `<p class="erreur" role="alert">${esc(E.msg)}</p>` : ""}
        <div class="total"><span>Total TTC</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} HT</small></div></div>
        <button class="btn" type="submit" ${E.envoi ? "disabled" : ""}>${E.envoi ? '<span class="tourne" aria-hidden="true"></span>Réservation en cours' : "Confirmer la réservation"}</button>
        <button class="lien" type="button" data-act="retour" ${E.envoi ? "disabled" : ""}>← Retour au poste</button>
      </form>`;
    return;
  }
  const libre = e === "libre";
  box.innerHTML = `${tete}
    <p class="etat"><i class="pt ${libre ? "" : "pris"}"></i>${e === "attente" ? "Lecture des disponibilités…" : libre ? `Libre · ${esc(jourLong(E.jour))}` : e === "pris" ? `Déjà réservé sur ce créneau · ${esc(jourLong(E.jour))}` : `Indisponible · ${esc(jourLong(E.jour))}`}</p>
    <p class="texte">${esc(z.texte)}</p>
    <ul class="equip">${z.equipements.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <div><span class="label" id="f-l-cr" style="display:block;margin-bottom:8px">Créneau</span><div class="options" role="radiogroup" aria-labelledby="f-l-cr">${Object.entries(CRENEAUX).map(([c, t]) => { const ec = etatDe(p.code, c), ok = ec === "libre";
      return `<button class="option" type="button" role="radio" aria-checked="${c === E.creneau}" data-creneau="${c}" ${ok || c === E.creneau ? "" : "disabled"}><b>${esc(t)}</b><small>${esc(heures(c)) || "—"}</small><span class="prix">${ok ? eur(prix(c)) : esc(libelleEtat(ec))}</span></button>`; }).join("")}</div></div>
    ${E.msg ? `<p class="erreur" role="alert">${esc(E.msg)}</p>` : ""}
    <div class="total"><span>${libre ? "Prix HT" : "Ce créneau"}</span><div><b>${libre && px ? eur(px) : "—"}</b>${libre && px ? `<small>${eur(px * 1.2)} TTC</small>` : ""}</div></div>
    <button class="btn" type="button" data-act="reserver" ${libre ? "" : "disabled"}>${libre ? "Réserver ce poste" : e === "pris" ? "Poste occupé" : "Indisponible"}</button>
    ${libre ? "" : `<button class="lien" type="button" data-act="autre">Voir un poste libre du même type</button>`}`;
}

function lireForm() { const f = $("f-form"); if (!f) return; const d = new FormData(f); E.form = { prenom: d.get("prenom").trim(), nom: d.get("nom").trim(), email: d.get("email").trim().toLowerCase(), societe: d.get("societe").trim(), accord: !!d.get("accord"), site_web: d.get("site_web") }; }
function validerForm() {
  let ok = true; const regle = (id, test, msg) => { const el = $(id), bad = !test(el.value.trim()); el.parentElement.querySelector(".msg").textContent = bad ? msg : ""; if (bad && ok) { el.focus(); ok = false; } };
  regle("f-prenom", v => v.length >= 1, "Indiquez votre prénom."); regle("f-nomf", v => v.length >= 1, "Indiquez votre nom."); regle("f-email", v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Cette adresse e-mail n'est pas valide.");
  if (ok && !E.form.accord) { E.msg = "Cochez la case pour accepter les conditions de réservation."; dessinerFiche(); return false; }
  return ok;
}
async function envoyer() {
  lireForm(); E.msg = null; if (!validerForm()) return;
  const p = posteApi(E.choix), code = E.choix, v = { poste: p.id, jour: E.jour, creneau: E.creneau, ...E.form, ouvert_le: E.ouvertLe };
  const attente = Math.max(0, 4200 - (Date.now() - E.ouvertLe));
  E.envoi = true; dessinerFiche();
  try {
    if (attente) await new Promise(r => setTimeout(r, attente));
    const r = await donnees.reserver(v), px = prix(v.creneau);
    E.fin = { ...r, prenom: v.prenom, email: v.email, jour: v.jour, creneau: v.creneau, heures: heures(v.creneau), ttc: (r.montantHt ?? px) * 1.2 };
    E.envoi = false; scene && scene.tamponner(code); await chargerEtat();
    // si la relecture échoue, on reflète quand même la réservation qui vient d'être faite
    if (E.etat && !r.simule) { const q = posteApi(code); if (q && q.etat[v.creneau] === "libre") { q.etat[v.creneau] = "pris"; q.etat.journee = "pris"; rafraichir(); } }
  } catch (err) {
    E.envoi = false;
    if (err.code === "conflit") { if (err.etat) E.etat = err.etat; else await chargerEtat(); E.etape = 1; E.msg = err.message; }
    else E.msg = err instanceof TypeError ? "La connexion a été interrompue. La réservation a peut-être été enregistrée : vérifiez l'état du poste avant de recommencer." : (err.message || "La réservation n'a pas pu être enregistrée.");
    rafraichir();
  }
}
$("f-corps").addEventListener("click", e => {
  const o = e.target.closest("[data-creneau]"); if (o && !o.disabled) { E.creneau = o.dataset.creneau; E.msg = null; dessinerBarre(); rafraichir(); $("f-corps").querySelector(`[data-creneau="${E.creneau}"]`)?.focus(); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "reserver") { E.etape = 2; E.msg = null; dessinerFiche(); cadrer(); $("f-prenom")?.focus(); }
  if (a.dataset.act === "retour") { lireForm(); E.etape = 1; E.msg = null; dessinerFiche(); }
  if (a.dataset.act === "fermer") { choisir(null); scene && scene.vueEnsemble(); }
  if (a.dataset.act === "autre") { const p = parCode[E.choix], n = POSTES_PLAN.find(q => q.zone === p.zone && etatDe(q.code) === "libre") || POSTES_PLAN.find(q => etatDe(q.code) === "libre"); if (n) choisir(n.code, { focus: true }); else { E.msg = "Aucun poste libre sur ce créneau. Essayez un autre jour."; dessinerFiche(); } }
});
$("f-corps").addEventListener("submit", e => { e.preventDefault(); if (!E.envoi) envoyer(); });
$("f-corps").addEventListener("input", () => { if (E.etape === 2) lireForm(); });
$("f-fermer").addEventListener("click", () => choisir(null));
$("b-ensemble").addEventListener("click", () => { E.zone = null; dessinerBarre(); choisir(null); scene && scene.vueEnsemble(); });
const ouvrirListe = o => { $("liste").hidden = !o; $("b-liste").setAttribute("aria-expanded", String(o)); if (o) { dessinerListe(); $("liste-corps").querySelector("button")?.focus(); } else $("b-liste").focus(); };
$("b-liste").addEventListener("click", () => ouvrirListe($("liste").hidden));
$("liste-fermer").addEventListener("click", () => ouvrirListe(false));
$("liste-corps").addEventListener("click", e => { const l = e.target.closest("[data-code]"); if (!l) return; if (!document.body.classList.contains("sans-3d")) ouvrirListe(false); choisir(l.dataset.code, { focus: true }); });
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("liste").hidden && !document.body.classList.contains("sans-3d")) return ouvrirListe(false); if (E.choix && !E.envoi) choisir(null); });
addEventListener("resize", () => cadrer());
$("z-plus").addEventListener("click", () => scene && scene.zoom(1.5));
$("z-moins").addEventListener("click", () => scene && scene.zoom(1 / 1.5));

/* ---------- Démarrage ---------- */
creerReperes(); dessinerBarre(); rafraichir();
const pretDonnees = chargerEtat();
(async () => {
  let s = null;
  try { const { creerScene } = await import("./scene.js"); s = await creerScene($("scene"), {
    onSurvol: code => { E.survol = code; for (const c in reperes) reperes[c].classList.toggle("survol", c === code && c !== E.choix); },
    onChoix: code => { if (code) choisir(code); },
    onGeste: () => $("aide").classList.add("vu"),
    onImage: placerReperes,
    onIntroFin: () => $("reperes").classList.add("arrive"),
  }); } catch (err) { console.error(err); }
  if (!s) {
    // Si le rendu ne se charge pas, la liste remplace la scène.
    document.body.classList.add("sans-3d"); $("reperes").hidden = true; $("liste").hidden = false;
    const b = document.createElement("p"); b.className = "bandeau info"; b.style.cssText = "position:static;transform:none;margin:0 auto 12px"; b.textContent = "La vue du plateau n'a pas pu se charger. Vous pouvez réserver depuis la liste."; $("liste").prepend(b);
    dessinerListe(); $("charge").classList.add("fini"); return;
  }
  scene = s; window.__plateau = { scene, E }; cadrer(); rafraichir();
  await Promise.race([pretDonnees, new Promise(r => setTimeout(r, 2500))]);
  $("charge").classList.add("fini"); scene.demarrer();
  setTimeout(() => $("aide").classList.add("vu"), 14000);
})();

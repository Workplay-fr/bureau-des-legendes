// Fichier généré par outils/en.py à partir de la version française : ne pas modifier à la main.
// Interface du plateau : date, créneau, filtres, repères, fiche du poste et réservation.
import { POSTES_PLAN, ZONES } from "./plan.js";
import { donnees } from "./donnees.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => Number(n).toLocaleString("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const CRENEAUX = { matin: "Morning", apres: "Afternoon", journee: "Full day" };
const jourParis = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
const jourLong = j => new Date(j + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const jourCourt = j => new Date(j + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const iso = c => c.toISOString().slice(0, 10);
// Le ou les jours demandés, en clair : « lundi 16 novembre » ou « 16 jours, du 16 nov. au 11 déc. ».
const quand = () => { const js = E.etat && E.etat.jours; return !E.fin || !js || js.length < 2 ? jourLong(E.jour) : `${js.length} days, ${jourCourt(js[0])} to ${jourCourt(js[js.length - 1])}`; };

const LIEN = new URLSearchParams(location.search);
const E = { jour: /^\d{4}-\d{2}-\d{2}$/.test(LIEN.get("jour") || "") ? LIEN.get("jour") : null, creneau: "journee", zone: null, etat: null, charge: false, erreur: null, choix: null, etape: 1, envoi: false, ouvertLe: 0, fin: null, survol: null, form: {}, fin: null, samedi: false };
let scene = null;
const parCode = Object.fromEntries(POSTES_PLAN.map(p => [p.code, p]));
const codeDe = nom => String(nom || "").replace(/^Poste\s+/i, "");
// Fiche de chaque poste telle que Nexudus la donne : catégorie (déduite des équipements cochés), description, équipements.
const EQUIP = { NaturalLight: "Natural light", StandingDesk: "Sit-stand desk", QuietZone: "Quiet zone", DualDisplayScreen: "Dual screens", DesktopMonitor: "Monitor", LargeDisplay: "Large screen", DisplayScreen: "Screen", Projector: "Projector", VideoConferencing: "Video conferencing", WirelessPresentation: "Wireless screen sharing", ConferencePhone: "Conference phone", WhiteBoard: "Whiteboard", FlipChart: "Flip chart", Soundproof: "Soundproofed", AirConditioning: "Air conditioning", Internet: "Fibre and built-in sockets", WirelessCharger: "Wireless charger", PrivacyScreen: "Privacy screen", SecureStorage: "Day locker", TeaAndCoffee: "Tea and coffee", Catering: "Catering", Drinks: "Drinks" };
const TEXTES_NEXUDUS = document.documentElement.lang !== "en"; // en anglais, les descriptions traduites de la page sont conservées
function fichesNexudus(d) {
  for (const a of (d && d.postes) || []) { const p = POSTES_PLAN.find(q => q.code === codeDe(a.nom)); if (!p) continue;
    if (ZONES[a.zone]) p.zone = a.zone;
    p.texte = TEXTES_NEXUDUS && a.description ? a.description : null;
    const eq = (a.equipements || []).map(k => EQUIP[k]).filter((x, i, t) => x && t.indexOf(x) === i); p.equipements = eq.length ? eq : null; }
}
const posteApi = code => E.etat && E.etat.postes.find(p => codeDe(p.nom) === code);
const etatDe = (code, c = E.creneau) => { const p = posteApi(code); return p ? p.etat[c] : E.erreur ? "passe" : "attente"; };
const libelleEtat = e => ({ libre: "Free", pris: "Taken", passe: "Unavailable", attente: "…" }[e] || "");
const heures = c => { const h = E.etat && E.etat.creneaux[c]; return h ? `${h.de}:00 – ${h.a}:00` : ""; };
const prix = c => { const h = E.etat && E.etat.creneaux[c]; return h ? h.prix : null; };

/* ---------- Barre : jours, créneaux, zones ---------- */
function puces(box, items, valeur, choisir) {
  box.innerHTML = items.map(i => `<button class="puce" type="button" role="radio" aria-checked="${i.v === valeur}" data-v="${esc(i.v ?? "")}">${i.petit ? `<small>${esc(i.petit)}</small>` : ""}${esc(i.t)}</button>`).join("");
  box.onclick = e => { const b = e.target.closest(".puce"); if (b) choisir(b.dataset.v || null); };
  box.onkeydown = e => { if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return; const bs = [...box.querySelectorAll(".puce")], i = bs.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click(); };
}
function dessinerBarre() {
  const auj = jourParis(new Date());
  const js = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ms = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ouvert = v => new Date(v + "T12:00:00Z").getUTCDay() !== 0, premier = ouvert(auj) ? auj : iso(new Date(Date.parse(auj + "T12:00:00Z") + 864e5));
  if (!E.jour || E.jour < premier || !ouvert(E.jour)) { E.jour = premier; E.fin = null; }
  // Champ des dates, comme sur un site de réservation : « Du … Au … », un clic ouvre le calendrier.
  const court = v => { const c = new Date(v + "T12:00:00Z"); return `${v === auj ? "today" : js[c.getUTCDay()]} ${c.getUTCDate()} ${ms[c.getUTCMonth()]}`; };
  $("dates").innerHTML = `<span><small>From</small>${esc(court(E.jour))}</span><i aria-hidden="true">→</i><span class="${E.fin ? "" : "vide"}"><small>To</small>${E.fin ? esc(court(E.fin)) : "One day only"}</span>`;
  const garder = (box, f) => { const a = document.activeElement, v = a && box.contains(a) ? a.dataset.v : undefined; f(); if (v !== undefined) box.querySelector(`[data-v="${v}"]`)?.focus(); };
  garder($("creneaux"), () => puces($("creneaux"), Object.entries(CRENEAUX).map(([v, t]) => ({ v, t })), E.creneau, v => { E.creneau = v; dessinerBarre(); rafraichir(); }));
  garder($("zones"), () => puces($("zones"), [{ v: null, t: "All" }, ...Object.entries(ZONES).map(([v, z]) => ({ v, t: z.nom }))], E.zone, v => { E.zone = v; dessinerBarre(); if (scene) { v ? scene.cadrerZone(v) : scene.vueEnsemble(); } rafraichir(); }));
}

/* ---------- Calendrier des dates : premier jour, puis dernier jour (ou un seul jour) ---------- */
const CAL = { mois: null, debut: null };
const SEM = ["M", "T", "W", "T", "F", "S", "S"];
const plusJours = (v, n) => iso(new Date(Date.parse(v + "T12:00:00Z") + n * 864e5));
function ouvrirCal(oui) {
  const cal = $("cal"), b = $("dates"); cal.hidden = !oui; b.setAttribute("aria-expanded", String(oui)); if (!oui) return;
  CAL.mois = E.jour.slice(0, 7); CAL.debut = null;
  const r = b.getBoundingClientRect(); cal.style.left = Math.max(12, Math.min(r.left, innerWidth - 332)) + "px"; cal.style.top = r.bottom + 8 + "px"; dessinerCal();
}
function dessinerCal() {
  const cal = $("cal"), auj = jourParis(new Date()), max = plusJours(auj, 60);
  const [y, m] = CAL.mois.split("-").map(Number), c = new Date(Date.UTC(y, m - 1, 1)), titre = c.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const de = CAL.debut || E.jour, a = CAL.debut ? null : E.fin, limite = CAL.debut ? plusJours(CAL.debut, 30) : max;
  let h = ""; for (let k = (c.getUTCDay() + 6) % 7; k > 0; k--) h += "<span></span>";
  for (; c.getUTCMonth() === m - 1; c.setUTCDate(c.getUTCDate() + 1)) { const v = iso(c), off = v < auj || v > limite || c.getUTCDay() === 0;
    h += `<button type="button" data-j="${v}" class="${v === de || v === a ? "sel" : a && v > de && v < a && (E.samedi || c.getUTCDay() !== 6) ? "entre" : ""}" ${off ? "disabled" : ""}>${c.getUTCDate()}</button>`; }
  cal.innerHTML = `<div class="cal-tete"><button type="button" data-mois="-1" aria-label="Previous month" ${CAL.mois <= auj.slice(0, 7) ? "disabled" : ""}>‹</button><b>${esc(titre)}</b><button type="button" data-mois="1" aria-label="Next month" ${CAL.mois >= max.slice(0, 7) ? "disabled" : ""}>›</button></div>
    <div class="cal-sem">${SEM.map(x => `<span>${x}</span>`).join("")}</div><div class="cal-jours">${h}</div>
    <p class="cal-aide">${CAL.debut ? "Pick the last day, or confirm for this day only." : "Pick the first day."}</p>
    <div class="cal-raccourcis"><button type="button" data-duree="0">1 day</button><button type="button" data-duree="6">1 week</button><button type="button" data-duree="27">1 month</button></div>
    <div class="cal-pied"><label><input type="checkbox" id="cal-sam" ${E.samedi ? "checked" : ""}> Include Saturdays</label><button class="btn" type="button" data-cal="ok">Confirm</button></div>`;
}
function appliquerDates(jour, fin) { E.jour = jour; E.fin = fin && fin > jour ? fin : null; ouvrirCal(false); dessinerBarre(); chargerEtat(); $("dates").focus(); }
function brancherCal() {
  const cal = $("cal");
  $("dates").addEventListener("click", () => ouvrirCal(cal.hidden));
  cal.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t || t.disabled) return;
    if (t.dataset.mois) { const [y, m] = CAL.mois.split("-").map(Number); CAL.mois = iso(new Date(Date.UTC(y, m - 1 + Number(t.dataset.mois), 1))).slice(0, 7); return dessinerCal(); }
    if (t.dataset.j) { const v = t.dataset.j; if (CAL.debut && v > CAL.debut) return appliquerDates(CAL.debut, v); CAL.debut = v; return dessinerCal(); }
    if (t.dataset.duree) { const de = CAL.debut || E.jour, n = Number(t.dataset.duree); return appliquerDates(de, n ? plusJours(de, n) : null); }
    if (t.dataset.cal) return CAL.debut ? appliquerDates(CAL.debut, null) : ouvrirCal(false);
  });
  cal.addEventListener("change", e => { if (e.target.id === "cal-sam") { E.samedi = e.target.checked; dessinerCal(); chargerEtat(); } });
  document.addEventListener("pointerdown", e => { if (!cal.hidden && !cal.contains(e.target) && !$("dates").contains(e.target)) ouvrirCal(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !cal.hidden) { ouvrirCal(false); $("dates").focus(); } });
  addEventListener("resize", () => { if (!cal.hidden) ouvrirCal(false); });
}

/* ---------- Données ---------- */
let jeton = 0;
async function chargerEtat() {
  const j = ++jeton; E.charge = true; E.erreur = null; rafraichir();
  try { const d = await donnees.etat(E.jour, E.fin, E.samedi); if (j !== jeton) return; E.etat = d; fichesNexudus(d); }
  catch (e) { if (j !== jeton) return; E.etat = null; E.erreur = e.message || "Availability is unavailable at the moment."; }
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
  $("compte").innerHTML = E.charge && !E.etat ? "Loading availability…" : E.erreur ? "" : `<b data-n="${libres}">${libres}</b> ${libres === 1 ? "free desk" : "free desks"} out of ${visibles.length} · ${esc(quand())} · ${esc(CRENEAUX[E.creneau].toLowerCase())}`;
  compter($("compte").querySelector("b"), avant, libres);
  // bandeau : erreur ou données simulées
  const b = $("bandeau");
  if (E.erreur) { b.hidden = false; b.className = "bandeau"; b.innerHTML = `${esc(E.erreur)}<button type="button" id="reessayer">Try again</button>`; $("reessayer").onclick = chargerEtat; }
  else if (donnees.source === "simule") { b.hidden = false; b.className = "bandeau info"; b.textContent = "Offline preview: availability is simulated and no booking is recorded."; }
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
    return `<button class="ligne" type="button" data-code="${p.code}">${esc(p.nom)}<span><i class="pt ${e === "libre" ? "" : e === "pris" ? "pris" : "passe"}"></i>${esc(libelleEtat(e))}${e === "libre" && px ? " · " + eur(px) + " excl. VAT" : ""}</span></button>`; }).join("")).join("");
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
  const tete = `<div><span class="label">Flexible desk · ${esc(z.nom)}</span><h2 id="f-nom">${esc(p.nom)}</h2></div>`;
  if (E.fin) {
    const r = E.fin;
    box.innerHTML = `${tete}
      <svg class="sceau" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="36"/><path d="M25 39l9 9 17-19"/></svg>
      <p style="font-size:17px">${r.simule ? "Simulated booking." : `All set, ${esc(r.prenom)}.`}</p>
      <p class="texte">${r.simule ? "This preview works offline: <b>nothing has been recorded</b> in Nexudus and no desk is actually booked." : `The desk is held in your name. The booking is recorded in Nexudus, awaiting confirmation by the team. An email will be sent to ${esc(r.email)}.`}</p>
      <ul class="recap"><li><span>Desk</span>${esc(p.nom)} · ${esc(z.nom)}</li><li><span>When</span>${esc(r.quand)}<br>${esc(CRENEAUX[r.creneau])} · ${esc(r.heures)}</li><li><span>Amount</span>${eur(r.ttc)} incl. VAT${r.simule ? "" : " (demo payment)"}</li>${r.reference ? `<li><span>Reference</span>${esc(r.reference)}</li>` : ""}</ul>
      <button class="btn" type="button" data-act="fermer" style="margin-top:auto">Back to the floor</button>`;
    return;
  }
  if (E.etape === 3) {
    // Paiement : même présentation que les autres parcours du site. Les champs de carte sont des valeurs de test, non modifiables.
    const v = E.form, simule = donnees.source === "simule";
    box.innerHTML = `${tete}
      <ul class="recap"><li><span>When</span>${esc(quand())}<br>${esc(CRENEAUX[E.creneau])} · ${esc(heures(E.creneau))}</li><li><span>For</span>${esc((v.prenom + " " + v.nom).trim())}</li></ul>
      <div class="paiement">
        <p class="note"><span aria-hidden="true">ⓘ</span><span>${simule ? "<b>Offline preview:</b> payment and booking are simulated, nothing will be recorded." : "<b>Demo payment:</b> no card is charged, and the booking is recorded."}</span></p>
        <div class="carte-ico" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="carte-l">
          <div class="champ"><label for="f-cb">Card number</label><input id="f-cb" value="4242 4242 4242 4242" readonly tabindex="-1"></div>
          <div class="champ"><label for="f-exp">Expiry</label><input id="f-exp" value="12 / 34" readonly tabindex="-1"></div>
          <div class="champ"><label for="f-cvc">CVC</label><input id="f-cvc" value="123" readonly tabindex="-1"></div>
        </div>
        <div class="champ"><label for="f-tit">Cardholder</label><input id="f-tit" value="${esc((v.prenom + " " + v.nom).trim().toUpperCase())}" readonly tabindex="-1"></div>
      </div>
      ${E.msg ? `<p class="erreur" role="alert">${esc(E.msg)}</p>` : ""}
      <div class="total"><span>Total incl. VAT</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} excl. VAT</small></div></div>
      <button class="btn" type="button" data-act="payer" ${E.envoi ? "disabled" : ""}>${E.envoi ? `<span class="tourne" aria-hidden="true"></span>${esc(E.statut || "Processing payment")}` : "Pay " + eur(px * 1.2)}</button>
      <button class="lien" type="button" data-act="coord" ${E.envoi ? "disabled" : ""}>← Details</button>
      <p class="statut" role="status" aria-live="polite">${E.envoi ? esc(E.statutLong || "") : ""}</p>`;
    return;
  }
  if (E.etape === 2) {
    const v = E.form;
    box.innerHTML = `${tete}
      <p class="etat"><i class="pt"></i>${esc(quand())} · ${esc(CRENEAUX[E.creneau].toLowerCase())} · ${esc(heures(E.creneau))}</p>
      <form id="f-form" novalidate style="display:flex;flex-direction:column;gap:16px;flex:1">
        <div class="champs">
          <div class="champ"><label for="f-prenom">First name</label><input id="f-prenom" name="prenom" autocomplete="given-name" value="${esc(v.prenom)}"><span class="msg"></span></div>
          <div class="champ"><label for="f-nomf">Last name</label><input id="f-nomf" name="nom" autocomplete="family-name" value="${esc(v.nom)}"><span class="msg"></span></div>
          <div class="champ large"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" value="${esc(v.email)}"><span class="msg"></span></div>
          <div class="champ large"><label for="f-societe">Company (optional)</label><input id="f-societe" name="societe" autocomplete="organization" value="${esc(v.societe)}"><span class="msg"></span></div>
        </div>
        <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label for="f-site">Website</label><input id="f-site" name="site_web" tabindex="-1" autocomplete="off"></div>
        <label class="accord"><input type="checkbox" name="accord" ${v.accord ? "checked" : ""}> I accept the booking terms: free cancellation until the day before.</label>
        ${E.msg ? `<p class="erreur" role="alert">${esc(E.msg)}</p>` : ""}
        <div class="total"><span>Total incl. VAT</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} excl. VAT</small></div></div>
        <button class="btn" type="submit">Go to payment</button>
        <button class="lien" type="button" data-act="retour">← Back to the desk</button>
      </form>`;
    return;
  }
  const libre = e === "libre";
  // Poste pris sur le créneau choisi mais libre sur une demi-journée : on le dit et on propose d'y basculer.
  const reste = e === "pris" ? ["matin", "apres"].find(c => c !== E.creneau && etatDe(p.code, c) === "libre") : null;
  const DEMI = { matin: "in the morning", apres: "in the afternoon" };
  box.innerHTML = `${tete}
    <p class="etat"><i class="pt ${libre ? "" : e === "pris" ? "pris" : "passe"}"></i>${e === "attente" ? "Loading availability…" : libre ? `Free · ${esc(quand())}` : e === "pris" ? `${reste ? `Taken ${DEMI[reste === "matin" ? "apres" : "matin"]}, free ${DEMI[reste]}` : "Already booked for this slot"} · ${esc(quand())}` : `Unavailable · ${esc(quand())}`}</p>
    <p class="texte">${esc(p.texte || z.texte)}</p>
    <ul class="equip">${(p.equipements || z.equipements).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <div><span class="label" id="f-l-cr" style="display:block;margin-bottom:8px">Time slot</span><div class="options" role="radiogroup" aria-labelledby="f-l-cr">${Object.entries(CRENEAUX).map(([c, t]) => { const ec = etatDe(p.code, c), ok = ec === "libre";
      return `<button class="option" type="button" role="radio" aria-checked="${c === E.creneau}" data-creneau="${c}" ${ok || c === E.creneau ? "" : "disabled"}><b>${esc(t)}</b><small>${esc(heures(c)) || "—"}</small><span class="prix">${ok ? eur(prix(c)) : esc(libelleEtat(ec))}</span></button>`; }).join("")}</div></div>
    ${E.msg ? `<p class="erreur" role="alert">${esc(E.msg)}</p>` : ""}
    <div class="total"><span>${libre ? "Price excl. VAT" : "This slot"}</span><div><b>${libre && px ? eur(px) : "—"}</b>${libre && px ? `<small>${eur(px * 1.2)} incl. VAT</small>` : ""}</div></div>
    ${reste ? `<button class="btn" type="button" data-creneau="${reste}">See it ${DEMI[reste]} · ${eur(prix(reste))} excl. VAT</button>` : `<button class="btn" type="button" data-act="reserver" ${libre ? "" : "disabled"}>${libre ? "Book this desk" : e === "pris" ? "Desk taken" : "Unavailable"}</button>`}
    ${libre ? "" : `<button class="lien" type="button" data-act="autre">See a free desk of the same type</button>`}`;
}

function lireForm() { const f = $("f-form"); if (!f) return; const d = new FormData(f); E.form = { prenom: d.get("prenom").trim(), nom: d.get("nom").trim(), email: d.get("email").trim().toLowerCase(), societe: d.get("societe").trim(), accord: !!d.get("accord"), site_web: d.get("site_web") }; }
function validerForm() {
  let ok = true; const regle = (id, test, msg) => { const el = $(id), bad = !test(el.value.trim()); el.parentElement.querySelector(".msg").textContent = bad ? msg : ""; if (bad && ok) { el.focus(); ok = false; } };
  regle("f-prenom", v => v.length >= 1, "Please enter your first name."); regle("f-nomf", v => v.length >= 1, "Please enter your last name."); regle("f-email", v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "This email address is not valid.");
  if (ok && !E.form.accord) { E.msg = "Tick the box to accept the booking terms."; dessinerFiche(); return false; }
  return ok;
}
async function envoyer() {
  E.msg = null;
  const p = posteApi(E.choix), code = E.choix, v = { poste: p.id, jour: E.jour, creneau: E.creneau, fin: E.fin, jsem: E.samedi ? "1,2,3,4,5,6" : "1,2,3,4,5", ...E.form, ouvert_le: E.ouvertLe };
  const attente = Math.max(0, 4200 - (Date.now() - E.ouvertLe));
  E.envoi = true; E.statut = "Processing payment"; E.statutLong = "Authorising the demo payment…"; dessinerFiche();
  try {
    await new Promise(r => setTimeout(r, Math.max(attente, 1100)));
    E.statut = "Booking"; E.statutLong = donnees.source === "simule" ? "Simulating the booking…" : "Booking the desk in Nexudus…"; dessinerFiche();
    const r = await donnees.reserver(v), px = prix(v.creneau);
    E.fin = { ...r, prenom: v.prenom, email: v.email, jour: v.jour, quand: quand(), creneau: v.creneau, heures: heures(v.creneau), ttc: (r.montantHt ?? px) * 1.2 };
    E.envoi = false; scene && scene.tamponner(code); await chargerEtat();
    // si la relecture échoue, on reflète quand même la réservation qui vient d'être faite
    if (E.etat && !r.simule) { const q = posteApi(code); if (q && q.etat[v.creneau] === "libre") { q.etat[v.creneau] = "pris"; q.etat.journee = "pris"; rafraichir(); } }
  } catch (err) {
    E.envoi = false;
    if (err.code === "conflit") { if (err.etat) { E.etat = err.etat; fichesNexudus(err.etat); } else await chargerEtat(); E.etape = 1; E.msg = err.message; }
    else E.msg = err instanceof TypeError ? "The connection was interrupted. The booking may have been recorded: check the desk status before trying again." : (err.message || "The booking could not be recorded.");
    rafraichir();
  }
}
$("f-corps").addEventListener("click", e => {
  const o = e.target.closest("[data-creneau]"); if (o && !o.disabled) { E.creneau = o.dataset.creneau; E.msg = null; dessinerBarre(); rafraichir(); $("f-corps").querySelector(`[data-creneau="${E.creneau}"]`)?.focus(); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "reserver") { E.etape = 2; E.msg = null; dessinerFiche(); cadrer(); $("f-prenom")?.focus(); }
  if (a.dataset.act === "retour") { lireForm(); E.etape = 1; E.msg = null; dessinerFiche(); }
  if (a.dataset.act === "coord" && !E.envoi) { E.etape = 2; E.msg = null; dessinerFiche(); }
  if (a.dataset.act === "payer" && !E.envoi) envoyer();
  if (a.dataset.act === "fermer") { choisir(null); scene && scene.vueEnsemble(); }
  if (a.dataset.act === "autre") { const p = parCode[E.choix], n = POSTES_PLAN.find(q => q.zone === p.zone && etatDe(q.code) === "libre") || POSTES_PLAN.find(q => etatDe(q.code) === "libre"); if (n) choisir(n.code, { focus: true }); else { E.msg = "No free desk for this slot. Try another day."; dessinerFiche(); } }
});
$("f-corps").addEventListener("submit", e => { e.preventDefault(); if (E.etape !== 2) return; lireForm(); E.msg = null; if (!validerForm()) return; E.etape = 3; dessinerFiche(); $("f-corps").querySelector("[data-act=payer]")?.focus(); });
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
creerReperes(); dessinerBarre(); brancherCal(); rafraichir();
const pretDonnees = chargerEtat();
(async () => {
  let s = null;
  try { const { creerScene } = await import("../../js/scene.js"); s = await creerScene($("scene"), {
    onSurvol: code => { E.survol = code; for (const c in reperes) reperes[c].classList.toggle("survol", c === code && c !== E.choix); },
    onChoix: code => { if (code) choisir(code); },
    onGeste: () => $("aide").classList.add("vu"),
    onImage: placerReperes,
    onIntroFin: () => { $("reperes").classList.add("arrive"); const c = (LIEN.get("poste") || "").toUpperCase(); if (parCode[c]) setTimeout(() => { if (!E.choix) choisir(c); }, 500); },
  }); } catch (err) { console.error(err); }
  if (!s) {
    // Si le rendu ne se charge pas, la liste remplace la scène.
    document.body.classList.add("sans-3d"); $("reperes").hidden = true; $("liste").hidden = false;
    const b = document.createElement("p"); b.className = "bandeau info"; b.style.cssText = "position:static;transform:none;margin:0 auto 12px"; b.textContent = "The floor view could not load. You can book from the list."; $("liste").prepend(b);
    dessinerListe(); $("charge").classList.add("fini"); return;
  }
  scene = s; window.__plateau = { scene, E }; cadrer(); rafraichir();
  await Promise.race([pretDonnees, new Promise(r => setTimeout(r, 2500))]);
  $("charge").classList.add("fini"); scene.demarrer();
  setTimeout(() => $("aide").classList.add("vu"), 14000);
})();

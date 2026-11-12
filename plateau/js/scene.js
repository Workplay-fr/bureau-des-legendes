// Scène du plateau : le rendu de l'étage, dans lequel on se déplace, on zoome et on choisit un poste.
// Aucune donnée de disponibilité ici : main.js pousse les états et dessine les repères.
import { IMAGE, POSTES_PLAN, ILOTS_PLAN } from "./plan.js";

const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const doux = k => 1 - Math.pow(1 - k, 4);

export async function creerScene(cadre, rappel = {}) {
  // Structure : #scene > .monde (repère de l'image) > image, voile de mise en avant, contours
  const monde = document.createElement("div"); monde.className = "monde"; monde.style.width = IMAGE.l + "px"; monde.style.height = IMAGE.h + "px";
  const img = new Image(); img.alt = ""; img.draggable = false; img.decoding = "async";
  const voile = document.createElement("div"); voile.className = "voile";
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${IMAGE.l} ${IMAGE.h}`); svg.setAttribute("class", "contours");
  const ellipse = cls => { const e = document.createElementNS(NS, "ellipse"); e.setAttribute("class", cls); e.setAttribute("rx", 40); e.setAttribute("ry", 30); svg.appendChild(e); return e; };
  const cSurvol = ellipse("c-survol"), cChoix = ellipse("c-choix");
  // Couches : ambiance (lumière du créneau), rais de soleil, poussières, flou de mise au point, ombre portée, tracé d'ouverture
  const div = c => { const d = document.createElement("div"); d.className = c; return d; };
  const teinte = div("teinte"), rais = div("rais"), flou = div("flou"), ombre = div("ombre"), incline = div("incline");
  const SIL = IMAGE.silhouette.map(p => p.join(",")).join(" "), SOL = IMAGE.sol.map(p => p.join(",")).join(" ");
  ombre.innerHTML = `<svg viewBox="0 0 ${IMAGE.l} ${IMAGE.h}"><defs><filter id="f-ombre" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="20"/></filter></defs><polygon points="${SIL}" filter="url(#f-ombre)"/></svg>`;
  ombre.style.clipPath = `path(evenodd, "M0 0H${IMAGE.l}V${IMAGE.h}H0Z M${IMAGE.silhouette.map(p => p.join(" ")).join("L")}Z")`;
  teinte.style.clipPath = `polygon(${IMAGE.silhouette.map(p => `${p[0]}px ${p[1]}px`).join(",")})`;
  rais.style.clipPath = `polygon(${IMAGE.sol.map(p => `${p[0]}px ${p[1]}px`).join(",")})`;
  const poussiere = document.createElement("canvas"); poussiere.className = "poussiere"; poussiere.width = IMAGE.l / 2; poussiere.height = IMAGE.h / 2; poussiere.style.clipPath = rais.style.clipPath;
  const trace = document.createElementNS(NS, "svg"); trace.setAttribute("viewBox", `0 0 ${IMAGE.l} ${IMAGE.h}`); trace.setAttribute("class", "trace");
  const trait = (pts, d, ferme) => { const e = document.createElementNS(NS, ferme ? "polygon" : "polyline"); e.setAttribute("points", pts.map(p => p.join(",")).join(" ")); e.setAttribute("pathLength", 1); e.style.setProperty("--d", d + "s"); trace.appendChild(e); };
  trait(IMAGE.sol, 0, true); IMAGE.murs.forEach((m, i) => trait(m, 0.25 + i * 0.07));
  ILOTS_PLAN.forEach((il, i) => { const [dx, dy] = [il.postes[2][0] - 515, il.postes[2][1] - 338]; trait([[473, 341], [505, 298], [645, 330], [612, 372]].map(([x, y]) => [x + dx, y + dy]), 0.75 + i * 0.09, true); });
  monde.append(img, teinte, rais, poussiere, flou, ombre, voile, svg, trace); incline.appendChild(monde); cadre.appendChild(incline);
  const sceau = document.createElementNS(NS, "circle"); sceau.setAttribute("class", "c-sceau"); sceau.setAttribute("r", 30); svg.appendChild(sceau);
  const leger = matchMedia("(max-width:820px)").matches && (window.devicePixelRatio || 1) < 2;
  try { await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = leger ? IMAGE.leger : IMAGE.src; }); if (img.decode) await img.decode().catch(() => {}); }
  catch { return null; }

  const parCode = Object.fromEntries(POSTES_PLAN.map(p => [p.code, p]));
  const centre = p => ({ x: (p.x + p.fx) / 2, y: (p.y + p.fy) / 2 });
  const poserContour = (e, p) => { if (!p) { e.classList.remove("on"); return; } const c = centre(p), a = Math.atan2(p.fy - p.y, p.fx - p.x) * 180 / Math.PI; e.setAttribute("cx", c.x); e.setAttribute("cy", c.y); e.setAttribute("transform", `rotate(${a + 90} ${c.x} ${c.y})`); e.setAttribute("ry", 22 + Math.hypot(p.fx - p.x, p.fy - p.y) / 2); e.setAttribute("rx", 34); e.classList.add("on"); };

  /* ---------- Vue : échelle e et position (x, y) du coin de l'image à l'écran ---------- */
  const V = { e: 1, x: 0, y: 0 }; let anim = null, decal = { x: 0, y: 0 }, intention = { type: "ensemble" }, pret = false, sale = true;
  const taille = () => ({ l: cadre.clientWidth || 1, h: cadre.clientHeight || 1 });
  const etroit = () => matchMedia("(max-width:820px)").matches;
  // Zone d'écran laissée libre par l'interface
  function libre() { const t = taille(), haut = etroit() ? 150 : 190, bas = etroit() ? 70 : 56; const cx = t.l / 2 - decal.x, cy = (haut + t.h - bas) / 2 - Math.max(0, decal.y);
    return { l: Math.max(160, t.l - 2 * Math.abs(decal.x) - (etroit() ? 0 : 40)), h: Math.max(160, t.h - haut - bas - 2 * Math.max(0, decal.y)), cx, cy }; }
  // Vue qui fait tenir un rectangle de l'image dans la zone libre
  function vuePour([x1, y1, x2, y2], marge = 1, max = 99) { const z = libre(), e = Math.min(z.l / (x2 - x1), z.h / (y2 - y1), max) * marge; return { e, x: z.cx - (x1 + x2) / 2 * e, y: z.cy - (y1 + y2) / 2 * e }; }
  const vueEns = () => { const m = IMAGE.maquette; if (!etroit()) return vuePour(m);
    // sur mobile, la maquette est plus large que l'écran : on remplit la hauteur disponible et on laisse glisser
    const z = libre(), e = Math.max(z.l / (m[2] - m[0]), Math.min(z.h / (m[3] - m[1]), z.l / 560)); return { e, x: z.cx - 760 * e, y: z.cy - (m[1] + m[3]) / 2 * e }; };
  const eMin = () => Math.min(vueEns().e, vuePour(IMAGE.maquette).e) * 0.9, eMax = () => Math.max(vueEns().e * 1.5, 2.1 / Math.min(2, window.devicePixelRatio || 1) + 0.9);
  function contenir(v) { const t = taille(), m = IMAGE.maquette, gx = t.l * 0.5, gy = t.h * 0.5;
    v.e = borne(v.e, eMin(), eMax()); v.x = borne(v.x, gx - m[2] * v.e, t.l - gx - m[0] * v.e); v.y = borne(v.y, gy - m[3] * v.e, t.h - gy - m[1] * v.e); return v; }
  // Inclinaison : la maquette pivote de quelques degrés avec la souris, comme un objet posé sur une table
  const PERSP = 1700, I = { a: 0, b: 0, ca: 0, cb: 0 }, RAD = Math.PI / 180;
  function projeterEcran(x, y) { const t = taille(), X = x - t.l / 2, Y = y - t.h / 2, a = I.a * RAD, b = I.b * RAD;
    const x1 = X * Math.cos(b), z1 = -X * Math.sin(b), y2 = Y * Math.cos(a) - z1 * Math.sin(a), z2 = Y * Math.sin(a) + z1 * Math.cos(a), k = PERSP / (PERSP - z2); return { x: t.l / 2 + x1 * k, y: t.h / 2 + y2 * k }; }
  function versPlat(q) { let r = { ...q }; for (let i = 0; i < 3; i++) { const e = projeterEcran(r.x, r.y); r = { x: r.x - (e.x - q.x), y: r.y - (e.y - q.y) }; } return r; }
  function appliquer() { monde.style.transform = `translate3d(${V.x.toFixed(2)}px,${V.y.toFixed(2)}px,0) scale(${V.e.toFixed(5)})`;
    incline.style.transform = `rotateX(${I.a.toFixed(3)}deg) rotateY(${I.b.toFixed(3)}deg)`;
    ombre.firstChild.style.transform = `translate(${(14 - I.b * 7).toFixed(1)}px,${(20 + I.a * 7).toFixed(1)}px)`;
    sale = false; rappel.onImage && rappel.onImage(); }
  function aller(v, duree = 0.9) { contenir(v); if (RM || duree <= 0) { anim = null; Object.assign(V, v); sale = true; return; } anim = { de: { ...V }, a: v, t0: performance.now(), duree: duree * 1000 }; }
  function image(now) { requestAnimationFrame(image); if (!pret) return;
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.duree), q = doux(k);
      // l'échelle s'interpole en logarithme : le zoom paraît régulier
      V.e = Math.exp(Math.log(anim.de.e) + (Math.log(anim.a.e) - Math.log(anim.de.e)) * q); V.x = anim.de.x + (anim.a.x - anim.de.x) * q; V.y = anim.de.y + (anim.a.y - anim.de.y) * q; if (k >= 1) anim = null; sale = true; }
    if (Math.abs(I.ca - I.a) > 0.004 || Math.abs(I.cb - I.b) > 0.004) { I.a += (I.ca - I.a) * 0.07; I.b += (I.cb - I.b) * 0.07; sale = true; }
    if (!RM && ++tic % 2 === 0) poussieres(now);
    if (sale) appliquer(); }
  // Poussières dans la lumière : quelques points qui dérivent lentement
  let tic = 0; const ctx = poussiere.getContext("2d"), grains = Array.from({ length: 54 }, (_, i) => ({ x: 120 + ((i * 97) % 520), y: 110 + ((i * 53) % 330), r: 0.5 + (i % 4) * 0.28, v: 0.05 + (i % 5) * 0.022, p: i * 1.7 }));
  function poussieres(now) { if (document.hidden) return; const t = now / 1000; ctx.clearRect(0, 0, poussiere.width, poussiere.height);
    for (const g of grains) { g.x += g.v * 0.5 + Math.sin(t * 0.4 + g.p) * 0.05; g.y += g.v * 0.22 + Math.cos(t * 0.3 + g.p) * 0.04; if (g.x > 700) g.x = 80; if (g.y > 480) g.y = 90;
      ctx.globalAlpha = 0.22 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.9 + g.p)); ctx.fillStyle = "#FFF4DC"; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.3); ctx.fill(); } }
  function reprendre(duree) { if (intention.type === "poste") viserPoste(intention.code, duree); else if (intention.type === "zone") viserZone(intention.zone, duree); else if (intention.type === "ensemble") aller(vueEns(), duree); }
  function viserPoste(code, duree = 1.0) { const p = parCode[code], il = ILOTS_PLAN[p.ilot].cadre, z = libre(), c = centre(p);
    const e = borne(Math.min(z.l / ((il[2] - il[0]) * 1.5), z.h / ((il[3] - il[1]) * 1.35)), vueEns().e * 1.15, Math.min(eMax(), Math.max(1.7, vueEns().e * 1.5))); aller({ e, x: z.cx - ((il[0] + il[2]) / 2 * 0.55 + c.x * 0.45) * e, y: z.cy - ((il[1] + il[3]) / 2 * 0.55 + c.y * 0.45) * e }, duree); }
  function viserZone(zone, duree = 1.0) { const ils = ILOTS_PLAN.filter(i => i.zone === zone).map(i => i.cadre); if (!ils.length) return aller(vueEns(), duree);
    const b = [Math.min(...ils.map(c => c[0])) - 60, Math.min(...ils.map(c => c[1])) - 50, Math.max(...ils.map(c => c[2])) + 60, Math.max(...ils.map(c => c[3])) + 50]; aller(vuePour(b, 1, Math.min(eMax(), Math.max(1.5, vueEns().e * 1.4))), duree); }

  /* ---------- Gestes : glisser, molette, pincement, double clic ---------- */
  const doigts = new Map(); let depart = null, survol = null, choix = null, bouge = 0;
  const local = e => { const b = cadre.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const versImage = q0 => { const q = versPlat(q0); return { x: (q.x - V.x) / V.e, y: (q.y - V.y) / V.e }; };
  function viser(q) { const i = versImage(q); let mieux = null, dm = 1e9;
    for (const p of POSTES_PLAN) { const d = Math.min(Math.hypot(i.x - p.x, i.y - p.y), Math.hypot(i.x - p.fx, i.y - p.fy), Math.hypot(i.x - (p.x + p.fx) / 2, i.y - (p.y + p.fy) / 2)); if (d < dm) { dm = d; mieux = p; } }
    return mieux && dm < 30 ? mieux.code : null; }
  function zoomer(q, f, duree = 0) { const cible = anim ? anim.a : V, e = borne(cible.e * f, eMin(), eMax()), i = { x: (q.x - cible.x) / cible.e, y: (q.y - cible.y) / cible.e }; intention = { type: "libre" }; aller({ e, x: q.x - i.x * e, y: q.y - i.y * e }, duree); }
  const majSurvol = code => { if (code === survol) return; survol = code; poserContour(cSurvol, code && code !== choix ? parCode[code] : null); cadre.style.cursor = code ? "pointer" : ""; rappel.onSurvol && rappel.onSurvol(code); };
  cadre.addEventListener("wheel", e => { e.preventDefault(); rappel.onGeste && rappel.onGeste(); const pas = e.ctrlKey ? -e.deltaY * 0.012 : -e.deltaY * (e.deltaMode ? 0.05 : 0.0016); zoomer(local(e), Math.exp(borne(pas, -0.5, 0.5)), 0.18); }, { passive: false });
  cadre.addEventListener("pointerdown", e => { if (e.button > 0) return; cadre.setPointerCapture(e.pointerId); doigts.set(e.pointerId, local(e)); finIntro(); anim = null; bouge = 0;
    if (doigts.size === 1) depart = { q: local(e), v: { ...V }, t: performance.now() };
    else if (doigts.size === 2) { const [a, b] = [...doigts.values()]; depart = { pince: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v: { ...V } }; } });
  cadre.addEventListener("pointermove", e => { const q = local(e);
    if (!doigts.has(e.pointerId)) { if (e.pointerType !== "touch") { majSurvol(viser(q)); if (!RM) { const t = taille(), f = choix ? 0.45 : 1; I.cb = (q.x / t.l - 0.5) * 5.2 * f; I.ca = -(q.y / t.h - 0.5) * 3.6 * f; } } return; }
    doigts.set(e.pointerId, q); if (!depart) return;
    if (doigts.size === 1 && depart.q) { const dx = q.x - depart.q.x, dy = q.y - depart.q.y; bouge = Math.max(bouge, Math.hypot(dx, dy)); if (bouge < 5) return;
      intention = { type: "libre" }; cadre.classList.add("glisse"); Object.assign(V, contenir({ e: depart.v.e, x: depart.v.x + dx, y: depart.v.y + dy })); sale = true; rappel.onGeste && rappel.onGeste(); }
    else if (doigts.size === 2 && depart.pince) { const [a, b] = [...doigts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, e2 = borne(depart.v.e * d / depart.pince, eMin(), eMax()), i = { x: (depart.m.x - depart.v.x) / depart.v.e, y: (depart.m.y - depart.v.y) / depart.v.e };
      bouge = 99; intention = { type: "libre" }; Object.assign(V, contenir({ e: e2, x: m.x - i.x * e2, y: m.y - i.y * e2 })); sale = true; rappel.onGeste && rappel.onGeste(); } });
  const lacher = e => { if (!doigts.has(e.pointerId)) return; const q = local(e), clic = doigts.size === 1 && bouge < 6 && depart && depart.t && performance.now() - depart.t < 700; doigts.delete(e.pointerId); cadre.classList.remove("glisse");
    if (doigts.size === 1) { const [r] = [...doigts.values()]; depart = { q: r, v: { ...V }, t: 0 }; bouge = 99; } else depart = null;
    if (clic && e.type === "pointerup") { const code = viser(q); rappel.onChoix && rappel.onChoix(code); } };
  cadre.addEventListener("pointerup", lacher); cadre.addEventListener("pointercancel", lacher);
  cadre.addEventListener("pointerleave", () => { majSurvol(null); I.ca = I.cb = 0; });
  cadre.addEventListener("dblclick", e => { if (!viser(local(e))) zoomer(local(e), 1.7, 0.5); });
  new ResizeObserver(() => { if (pret) reprendre(0); }).observe(cadre);

  const minuteries = []; let introFinie = false;
  function finIntro() { if (introFinie) return; introFinie = true; minuteries.forEach(clearTimeout); cadre.classList.add("i-trace", "i-rendu", "pret"); rappel.onIntroFin && rappel.onIntroFin(); }
  // Rendus par créneau, s'ils ont été fournis
  const rendus = {};
  for (const [nom, src] of Object.entries(IMAGE.ambiances || {})) { const im = new Image(); im.className = "rendu-ambiance"; im.alt = ""; im.draggable = false; im.onload = () => { rendus[nom] = im; img.after(im); im.classList.toggle("on", cadre.dataset.ambiance === nom); cadre.classList.add("a-des-rendus"); }; im.src = src; }
  return {
    codes: POSTES_PLAN.map(p => p.code),
    demarrer() { const v = contenir(vueEns()); pret = true;
      if (RM) { Object.assign(V, v); sale = true; finIntro(); }
      else { // le tracé des murs se dessine, le rendu fait sa mise au point, puis les repères arrivent
        Object.assign(V, { e: v.e * 1.16, x: v.x - IMAGE.l * v.e * 0.08, y: v.y - IMAGE.h * v.e * 0.1 }); aller(v, 3.4); cadre.classList.add("i-trace");
        minuteries.push(setTimeout(() => cadre.classList.add("i-rendu"), 1500), setTimeout(finIntro, 2900)); }
      requestAnimationFrame(image); },
    majEtats() {},
    // Lumière du créneau choisi. Si un rendu dédié existe (IMAGE.ambiances), il remplace l'image en fondu ; sinon une teinte l'évoque.
    ambiance(nom) { cadre.dataset.ambiance = nom; for (const k in rendus) rendus[k].classList.toggle("on", k === nom); },
    // Sceau de confirmation posé sur le poste réservé
    tamponner(code) { const p = parCode[code]; if (!p) return; sceau.setAttribute("cx", p.x); sceau.setAttribute("cy", p.y); sceau.classList.remove("on"); void sceau.getBoundingClientRect(); sceau.classList.add("on"); },
    choisir(code, o = {}) { choix = code; poserContour(cChoix, code ? parCode[code] : null); if (code === survol) poserContour(cSurvol, null);
      if (code) { const c = centre(parCode[code]); voile.style.setProperty("--x", c.x + "px"); voile.style.setProperty("--y", c.y + "px"); }
      voile.classList.toggle("on", !!code); flou.classList.toggle("on", !!code); if (code) { const c = centre(parCode[code]); flou.style.setProperty("--x", c.x + "px"); flou.style.setProperty("--y", c.y + "px"); I.ca *= 0.45; I.cb *= 0.45; }
      if (code && o.camera !== false) { intention = { type: "poste", code }; viserPoste(code); } },
    cadrerZone(zone) { intention = zone ? { type: "zone", zone } : { type: "ensemble" }; reprendre(1.0); },
    vueEnsemble() { intention = { type: "ensemble" }; aller(vueEns(), 1.0); },
    decaler(x, y) { if (decal.x === x && decal.y === y) return; decal = { x, y }; if (pret && intention.type !== "libre") reprendre(0.8); },
    projeter(code) { const p = parCode[code]; return p ? { ...projeterEcran(V.x + p.x * V.e, V.y + p.y * V.e), visible: true } : null; },
    loin() { return V.e < vueEns().e * 1.12 && intention.type !== "zone" && intention.type !== "poste"; },
    zoom(f) { const t = taille(); zoomer({ x: t.l / 2 - decal.x, y: t.h / 2 }, f, 0.4); },
    demander() { sale = true; },
  };
}

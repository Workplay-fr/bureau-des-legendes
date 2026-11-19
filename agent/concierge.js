// L'agent des Légendes (agent IA du site) : fenêtre de conversation reliée à /api/agent.
// Les offres et le devis viennent de Nexudus ; l'interface ne fait qu'afficher ce que renvoie le serveur.
(() => {
  if (window.__bdlConcierge) return; window.__bdlConcierge = true;
  const EN = (document.documentElement.lang || "fr").startsWith("en");
  const T = EN ? {
    bouton: "The Legends' agent", titre: "The Legends' agent", sous: "Live availability and quotes", place: "Ask your question…", envoyer: "Send",
    accueil: "Good day. I can answer your questions about the Bureau des Légendes, show you what is available and prepare a quote for your office. How can I help?",
    idees: ["An office for 4 people in January", "What memberships do you offer?", "Can I register my company here?", "Book a visit"],
    choisir: "Choose this offer", parMois: "excl. VAT / month", choix: o => `I'd like the offer “${o.titre}”.`, arrivee: "Move-in",
    devisT: "Quote prepared", devisS: "Our team will review it and send it to you shortly. You will be able to accept it online.", ref: "Reference", total: "Monthly total",
    erreur: "The agent is unavailable for a moment.", fermer: "Close", nouveau: "New conversation", dom: "registered office included", ia: "AI assistant · may make mistakes",
  } : {
    bouton: "L'agent des Légendes", titre: "L'agent des Légendes", sous: "Disponibilités et devis en direct", place: "Posez votre question…", envoyer: "Envoyer",
    accueil: "Bonjour. Je peux répondre à vos questions sur le Bureau des Légendes, vous montrer ce qui est disponible et préparer un devis pour votre bureau. Que puis-je faire pour vous ?",
    idees: ["Un bureau pour 4 personnes en janvier", "Quelles formules proposez-vous ?", "Puis-je domicilier ma société ?", "Visiter le lieu"],
    choisir: "Choisir cette offre", parMois: "HT / mois", choix: o => `Je choisis l'offre « ${o.titre} ».`, arrivee: "Arrivée",
    devisT: "Devis préparé", devisS: "Notre équipe le relit et vous l'envoie très vite. Vous pourrez l'accepter en ligne.", ref: "Référence", total: "Total mensuel",
    erreur: "L'agent est momentanément indisponible.", fermer: "Fermer", nouveau: "Nouvelle conversation", dom: "domiciliation incluse", ia: "Assistant IA · peut se tromper",
  };
  const eur = n => new Intl.NumberFormat(EN ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const dateTxt = s => { try { return new Date(s + "T12:00:00Z").toLocaleDateString(EN ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return s; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

  const css = `
  .cg-btn{position:fixed;left:50%;translate:-50% 0;bottom:max(26px,env(safe-area-inset-bottom,0px));z-index:190;display:flex;align-items:center;gap:16px;padding:20px 34px 20px 22px;border:0;border-radius:999px;cursor:pointer;
    font:500 15px/1 var(--f,"Jost",system-ui,sans-serif);letter-spacing:.18em;text-transform:uppercase;color:#fff;background:#19110B;box-shadow:0 20px 46px rgba(25,17,11,.3);
    animation:cgHalo 2.8s ease-out infinite,cgSouffle 2.8s ease-in-out infinite;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s}
  .cg-btn:hover{transform:translateY(-3px);animation-play-state:paused}
  .cg-btn.cg-part{opacity:0;transform:translateY(10px) scale(.92);pointer-events:none}
  @keyframes cgHalo{0%{box-shadow:0 20px 46px rgba(25,17,11,.3),0 0 0 0 rgba(60,106,158,.5)}75%,100%{box-shadow:0 20px 46px rgba(25,17,11,.3),0 0 0 18px rgba(60,106,158,0)}}
  @keyframes cgSouffle{50%{scale:1.035}}
  .cg-btn i{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#2C5486,#3C6A9E 45%,#7FA6D6 60%,#3C6A9E 80%,#2C5486);background-size:200% 200%;animation:cgLaque 4s ease-in-out infinite alternate;position:relative}
  .cg-btn i::after{content:"";position:absolute;inset:11px;border-radius:50%;background:#fff;opacity:.9;animation:cgPouls 2.4s ease-in-out infinite}
  @keyframes cgLaque{to{background-position:100% 100%}} @keyframes cgPouls{50%{transform:scale(.55);opacity:.5}}
  .cg{position:fixed;left:50%;translate:-50% 0;bottom:max(20px,env(safe-area-inset-bottom,0px));z-index:240;width:min(460px,calc(100vw - 32px));height:min(680px,calc(100dvh - 40px));
    display:flex;flex-direction:column;background:#fff;color:#19110B;border:1px solid rgba(25,17,11,.12);box-shadow:0 40px 90px rgba(25,17,11,.28);font-family:var(--f,"Jost",system-ui,sans-serif);
    transform-origin:bottom center;animation:cgIn .7s cubic-bezier(.22,1,.36,1) both}
  .cg.cg-sort{animation:cgOut .35s cubic-bezier(.55,0,.75,.2) both}
  .cg-voile{position:fixed;inset:0;z-index:230;background:rgba(25,17,11,.28);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .6s ease}
  .cg-voile.on{opacity:1;pointer-events:auto}
  .cg[hidden]{display:none}
  @keyframes cgIn{from{opacity:0;transform:translateY(40px) scale(.9);filter:blur(8px)}}
  @keyframes cgOut{to{opacity:0;transform:translateY(24px) scale(.95);filter:blur(4px)}}
  .cg-h{display:flex;align-items:center;gap:14px;padding:18px 18px 16px 22px;background:#19110B;color:#fff}
  .cg-h .cg-o{width:34px;height:34px;border-radius:50%;flex:none;background:linear-gradient(135deg,#2C5486,#3C6A9E 45%,#7FA6D6 60%,#3C6A9E 80%,#2C5486);background-size:200% 200%;animation:cgLaque 4s ease-in-out infinite alternate}
  .cg-h b{display:block;font-weight:500;font-size:14px;letter-spacing:.18em;text-transform:uppercase}
  .cg-h small{display:block;font-size:12px;color:#C7C0B8;margin-top:4px;letter-spacing:.02em}
  .cg-h button{margin-left:auto;background:none;border:0;color:#C7C0B8;cursor:pointer;font:inherit;font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:6px}
  .cg-h button:hover{color:#fff}
  .cg-m{flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
  .cg-b{max-width:88%;font-size:15px;line-height:1.55;padding:12px 15px;animation:cgMsg .4s cubic-bezier(.22,1,.36,1) both}
  @keyframes cgMsg{from{opacity:0;transform:translateY(8px)}}
  .cg-b.ia{background:#F6F1EB;align-self:flex-start}
  .cg-b.moi{background:#19110B;color:#fff;align-self:flex-end}
  .cg-ecrit{align-self:flex-start;display:flex;gap:5px;padding:14px 16px;background:#F6F1EB}
  .cg-ecrit i{width:6px;height:6px;border-radius:50%;background:#3C6A9E;animation:cgPt 1.2s infinite}
  .cg-ecrit i:nth-child(2){animation-delay:.15s}.cg-ecrit i:nth-child(3){animation-delay:.3s}
  @keyframes cgPt{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
  .cg-idees{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
  .cg-idees button{border:1px solid rgba(25,17,11,.18);background:#fff;padding:9px 12px;font:inherit;font-size:13px;cursor:pointer;color:#19110B;transition:border-color .2s,background .2s}
  .cg-idees button:hover{border-color:#3C6A9E;background:#E4EEF9}
  .cg-offres{display:flex;flex-direction:column;gap:10px;align-self:stretch}
  .cg-of{border:1px solid rgba(25,17,11,.14);padding:15px 16px;background:#fff;animation:cgMsg .45s cubic-bezier(.22,1,.36,1) both;position:relative;overflow:hidden}
  .cg-of::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#2C5486,#7FA6D6)}
  .cg-of b{display:block;font-weight:500;font-size:15px;letter-spacing:.04em}
  .cg-of small{display:block;color:#6B635C;font-size:13px;margin-top:3px}
  .cg-of .px{display:flex;align-items:baseline;gap:6px;margin-top:10px;font-size:22px;font-weight:400}
  .cg-of .px span{font-size:12px;color:#6B635C;letter-spacing:.06em}
  .cg-of button{margin-top:12px;width:100%;border:0;padding:12px;background:#19110B;color:#fff;font:inherit;font-size:12px;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;transition:background .25s}
  .cg-of button:hover{background:linear-gradient(135deg,#2C5486,#3C6A9E 45%,#5F8CC4 62%,#3C6A9E 82%,#2C5486)}
  .cg-dv{align-self:stretch;background:#19110B;color:#fff;padding:20px 20px;animation:cgMsg .5s cubic-bezier(.22,1,.36,1) both}
  .cg-dv .t{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#7FA6D6}
  .cg-dv b{display:block;font-weight:400;font-size:19px;margin-top:8px}
  .cg-dv dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:14px 0 0;font-size:13px}
  .cg-dv dt{color:#C7C0B8} .cg-dv dd{margin:0;text-align:right}
  .cg-dv p{margin:14px 0 0;font-size:13px;line-height:1.5;color:#C7C0B8}
  .cg-f{display:flex;gap:8px;padding:12px 14px 10px;border-top:1px solid rgba(25,17,11,.1)}
  .cg-f textarea{flex:1;resize:none;border:1px solid rgba(25,17,11,.18);padding:12px 13px;font:inherit;font-size:15px;line-height:1.35;max-height:120px;outline:0;color:#19110B;background:#fff}
  .cg-f textarea:focus{border-color:#3C6A9E}
  .cg-f button{border:0;background:#19110B;color:#fff;padding:0 16px;font:inherit;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
  .cg-f button:disabled{opacity:.4;cursor:default}
  .cg-pied{display:flex;justify-content:space-between;padding:0 16px 12px;font-size:11px;color:#8E8A83;letter-spacing:.04em}
  .cg-pied button{background:none;border:0;color:#8E8A83;font:inherit;cursor:pointer;text-decoration:underline;padding:0}
  body.modal-ouverte .cg-btn{display:none}
  @media (max-width:560px){.cg{left:0;translate:none;bottom:0;width:100vw;height:100dvh;border:0}.cg-btn{padding:16px 24px 16px 16px;font-size:13px;gap:12px}.cg-btn i{width:28px;height:28px}.cg-btn i::after{inset:9px}}
  @media (prefers-reduced-motion:reduce){.cg,.cg-b,.cg-of,.cg-dv,.cg-btn{animation:none}.cg-btn i,.cg-h .cg-o{animation:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement("button"); btn.className = "cg-btn"; btn.type = "button"; btn.innerHTML = `<i aria-hidden="true"></i>${T.bouton}`; btn.setAttribute("aria-haspopup", "dialog");
  const p = document.createElement("div"); p.className = "cg"; p.hidden = true; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", T.titre);
  p.innerHTML = `<div class="cg-h"><span class="cg-o" aria-hidden="true"></span><div><b>${T.titre}</b><small>${T.sous}</small></div><button type="button" class="cg-x">${T.fermer}</button></div>
    <div class="cg-m" aria-live="polite"></div>
    <form class="cg-f"><textarea rows="1" placeholder="${T.place}" aria-label="${T.place}"></textarea><button type="submit">${T.envoyer}</button></form>
    <div class="cg-pied"><span>${T.ia}</span><button type="button" class="cg-n">${T.nouveau}</button></div>`;
  document.body.append(btn, p);
  const zone = p.querySelector(".cg-m"), form = p.querySelector(".cg-f"), champ = form.querySelector("textarea"), go = form.querySelector("button");

  // Conversation gardée le temps de la session de navigation.
  const CLE = "bdl_concierge_" + (EN ? "en" : "fr");
  let etat = { h: [], memo: {}, rendu: [] };
  try { const s = JSON.parse(sessionStorage.getItem(CLE) || "null"); if (s && Array.isArray(s.h)) etat = s; } catch {}
  const garder = () => { try { sessionStorage.setItem(CLE, JSON.stringify(etat)); } catch {} };

  const bas = () => requestAnimationFrame(() => { zone.scrollTop = zone.scrollHeight; });
  const bulle = (txt, qui) => { const d = document.createElement("div"); d.className = "cg-b " + qui; d.innerHTML = md(txt); zone.appendChild(d); bas(); };
  function offres(o) {
    if (!o || !o.options || !o.options.length) return;
    const w = document.createElement("div"); w.className = "cg-offres";
    o.options.forEach((x, i) => {
      const c = document.createElement("div"); c.className = "cg-of"; c.style.animationDelay = (i * 0.12) + "s";
      c.innerHTML = `<b>${esc(x.titre)}</b><small>${esc(x.detail)} · ${T.arrivee} ${esc(dateTxt(x.date))}${x.domiciliation ? " · " + T.dom : ""}</small><div class="px">${eur(x.total_mensuel_ht)}<span>${T.parMois}</span></div><button type="button">${T.choisir}</button>`;
      c.querySelector("button").addEventListener("click", () => envoyer(T.choix(x)));
      w.appendChild(c);
    });
    zone.appendChild(w); bas();
  }
  function devis(d) {
    if (!d || !d.reference) return;
    const c = document.createElement("div"); c.className = "cg-dv";
    c.innerHTML = `<div class="t">${T.devisT}</div><b>${esc(d.titre || "")}</b><dl><dt>${T.ref}</dt><dd>${esc(d.reference)}</dd><dt>${T.arrivee}</dt><dd>${esc(dateTxt(d.date || ""))}</dd><dt>${T.total}</dt><dd>${eur(d.total || 0)} ${T.parMois}</dd></dl><p>${T.devisS}</p>`;
    zone.appendChild(c); bas();
  }
  function idees() {
    const w = document.createElement("div"); w.className = "cg-idees";
    T.idees.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.addEventListener("click", () => { w.remove(); envoyer(t); }); w.appendChild(b); });
    zone.appendChild(w); bas();
  }
  function afficherTout() {
    zone.innerHTML = ""; bulle(T.accueil, "ia");
    if (!etat.rendu.length) { idees(); return; }
    etat.rendu.forEach(r => r.t === "b" ? bulle(r.v, r.q) : r.t === "o" ? offres(r.v) : devis(r.v));
  }
  function action(a) {
    if (a === "visite") { const e = document.querySelector('[data-portal="tour"]'); if (e) { fermer(); e.click(); } }
    else if (a === "salle") { const e = document.querySelector("[data-salle]"); if (e) { fermer(); e.click(); } }
    else if (a === "poste") { const e = document.getElementById("poste"); if (e) { fermer(); e.scrollIntoView({ behavior: "smooth" }); } }
  }

  let occupe = false;
  async function envoyer(txt) {
    txt = String(txt || "").trim(); if (!txt || occupe) return;
    occupe = true; go.disabled = true; champ.value = ""; ajuster();
    zone.querySelector(".cg-idees")?.remove();
    bulle(txt, "moi"); etat.h.push({ role: "user", content: txt }); etat.rendu.push({ t: "b", q: "moi", v: txt }); garder();
    const ecrit = document.createElement("div"); ecrit.className = "cg-ecrit"; ecrit.innerHTML = "<i></i><i></i><i></i>"; zone.appendChild(ecrit); bas();
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historique: etat.h, lang: EN ? "en" : "fr", memo: etat.memo }) });
      const d = await r.json().catch(() => ({}));
      ecrit.remove();
      if (!d.ok) { bulle(d.erreur || T.erreur, "ia"); return; }
      if (d.memo) etat.memo = d.memo;
      if (d.texte) { bulle(d.texte, "ia"); etat.h.push({ role: "assistant", content: d.texte }); etat.rendu.push({ t: "b", q: "ia", v: d.texte }); }
      if (d.offres && d.offres.options?.length) { offres(d.offres); etat.rendu.push({ t: "o", v: d.offres }); }
      if (d.devis) { devis(d.devis); etat.rendu.push({ t: "d", v: d.devis }); }
      garder();
      (d.actions || []).forEach(a => setTimeout(() => action(a), 900));
    } catch { ecrit.remove(); bulle(T.erreur, "ia"); }
    finally { occupe = false; go.disabled = false; champ.focus(); }
  }
  const ajuster = () => { champ.style.height = "auto"; champ.style.height = Math.min(120, champ.scrollHeight) + "px"; };
  champ.addEventListener("input", ajuster);
  champ.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(champ.value); } });
  form.addEventListener("submit", e => { e.preventDefault(); envoyer(champ.value); });

  const voile = document.createElement("div"); voile.className = "cg-voile"; document.body.append(voile);
  voile.addEventListener("click", () => fermer());
  let tempo;
  function ouvrir() { clearTimeout(tempo); btn.classList.add("cg-part"); voile.classList.add("on"); p.classList.remove("cg-sort");
    tempo = setTimeout(() => { btn.hidden = true; }, 350);
    p.hidden = false; if (!zone.childElementCount) afficherTout(); setTimeout(() => champ.focus({ preventScroll: true }), 120); }
  function fermer() { clearTimeout(tempo); p.classList.add("cg-sort"); voile.classList.remove("on");
    tempo = setTimeout(() => { p.hidden = true; p.classList.remove("cg-sort"); btn.hidden = false; requestAnimationFrame(() => btn.classList.remove("cg-part")); }, 340); }
  btn.addEventListener("click", ouvrir);
  p.querySelector(".cg-x").addEventListener("click", fermer);
  p.querySelector(".cg-n").addEventListener("click", () => { etat = { h: [], memo: {}, rendu: [] }; garder(); afficherTout(); champ.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !p.hidden) fermer(); });
  window.bdlConcierge = { ouvrir, envoyer };
})();

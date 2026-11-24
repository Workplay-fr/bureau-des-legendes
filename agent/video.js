// Notification « Côté exploitant » : carte en bas à gauche qui propose la vidéo de la balade dans Nexudus.
// Elle glisse quelques secondes après l'arrivée (une fois aucune fenêtre ouverte), se replie en onglet au bout de 14 s
// ou au clic sur ×, et ne réapparaît pas pendant la visite (sessionStorage). Un clic ouvre la vidéo dans une fenêtre.
(() => {
  if (window.__bdlVideo) return; window.__bdlVideo = true;
  const EN = (document.documentElement.lang || "fr").startsWith("en");
  const VIDEO = "/video/bdl-exploitant.mp4?v=2", MINI = "/video/bdl-exploitant.jpg?v=2", DUREE = "2:11";
  const T = EN ? { sur: "Operator's view", titre: "What happens in Nexudus", voir: "Watch the video", fermer: "Close", replier: "Hide", onglet: "Video" }
               : { sur: "Côté exploitant", titre: "Ce qui se passe dans Nexudus", voir: "Voir la vidéo", fermer: "Fermer", replier: "Replier", onglet: "Vidéo" };
  const CLE = "bdl_video_vu";
  const lire = () => { try { return sessionStorage.getItem(CLE) === "1"; } catch { return false; } };
  const noter = () => { try { sessionStorage.setItem(CLE, "1"); } catch {} };

  const css = `
  .vn{position:fixed;left:20px;bottom:16px;z-index:185;width:320px;display:flex;gap:13px;align-items:center;padding:9px 30px 9px 9px;background:#fff;color:#19110B;
    border:1px solid rgba(25,17,11,.1);box-shadow:0 18px 44px -12px rgba(25,17,11,.28);font-family:var(--f,"Jost",system-ui,sans-serif);cursor:pointer;
    transform:translateX(calc(-100% - 40px));opacity:0;transition:transform .8s cubic-bezier(.22,1,.36,1),opacity .5s}
  .vn.on{transform:none;opacity:1}
  .vn.mesure{transform:none;visibility:hidden;transition:none}
  .vn .mi{position:relative;flex:none;width:100px;aspect-ratio:16/9;background:#19110B center/cover no-repeat;overflow:hidden}
  .vn .mi::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(25,17,11,.45))}
  .vn .lc{position:absolute;left:50%;top:50%;z-index:1;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;transition:transform .4s cubic-bezier(.22,1,.36,1)}
  .vn .lc::before{content:"";margin-left:3px;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #19110B}
  .vn:hover .lc{transform:scale(1.08)}
  .vn .du{position:absolute;right:5px;bottom:4px;z-index:1;font-size:10.5px;letter-spacing:.06em;color:#fff}
  .vn .tx{flex:1;min-width:0}
  .vn small{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#6B635C}
  .vn small::before{content:"";width:6px;height:6px;background:#3C6A9E}
  .vn b{display:block;margin-top:5px;font-weight:400;font-size:14.5px;line-height:1.3}
  .vn .x{position:absolute;top:4px;right:4px;width:26px;height:26px;border:0;background:none;color:#6B635C;font-size:17px;line-height:1;cursor:pointer}
  .vn .x:hover{color:#19110B}
  /* Onglet replié, collé au bord gauche ; il s'ouvre au survol */
  .vn.repli{transform:translateX(calc(-100% + 30px));opacity:1;padding-right:44px}
  .vn.repli .x{display:none}
  .vn.repli::after{content:attr(data-onglet);position:absolute;right:0;top:0;bottom:0;width:30px;display:grid;place-items:center;writing-mode:vertical-rl;transform:rotate(180deg);
    font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#fff;background:#19110B}
  .vn.repli:hover,.vn.repli:focus-visible{transform:none}
  .vn.repli:hover::after,.vn.repli:focus-visible::after{opacity:0}
  body.modal-ouverte .vn,.cg-voile.on ~ .vn{opacity:0;pointer-events:none}
  @media (max-width:1000px){.vn{bottom:92px}}
  @media (max-width:560px){.vn{left:12px;width:min(300px,calc(100vw - 24px));gap:11px}.vn .mi{width:88px}.vn b{font-size:14px}}
  .vl{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:24px;background:rgba(25,17,11,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .4s}
  .vl.on{opacity:1}
  .vl video{width:min(1200px,100%);max-height:calc(100dvh - 120px);background:#000;box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .vl button{position:absolute;top:18px;right:20px;border:1px solid rgba(255,255,255,.4);background:none;color:#fff;font:500 12px/1 var(--f,"Jost",system-ui,sans-serif);letter-spacing:.18em;text-transform:uppercase;padding:11px 16px;cursor:pointer}
  .vl button:hover{background:#fff;color:#19110B}
  @media (prefers-reduced-motion:reduce){.vn,.vl{transition:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const n = document.createElement("div");
  n.className = "vn"; n.tabIndex = 0; n.setAttribute("role", "button"); n.setAttribute("aria-label", `${T.voir} : ${T.titre} (${DUREE})`); n.dataset.onglet = T.onglet;
  n.innerHTML = `<div class="mi" style="background-image:url('${MINI}')"><span class="lc" aria-hidden="true"></span><span class="du">${DUREE}</span></div>
    <div class="tx"><small>${T.sur}</small><b>${T.titre}</b></div><button type="button" class="x" aria-label="${T.replier}">×</button>`;

  let tempo;
  const replier = () => { clearTimeout(tempo); n.classList.add("on", "repli"); noter(); };
  n.querySelector(".x").addEventListener("click", e => { e.stopPropagation(); replier(); });

  function ouvrirVideo() {
    replier();
    const l = document.createElement("div"); l.className = "vl"; l.setAttribute("role", "dialog"); l.setAttribute("aria-label", T.titre);
    l.innerHTML = `<button type="button">${T.fermer}</button><video src="${VIDEO}" poster="${MINI}" controls playsinline preload="auto"></video>`;
    document.body.appendChild(l); document.body.classList.add("modal-ouverte");
    const v = l.querySelector("video");
    requestAnimationFrame(() => l.classList.add("on"));
    v.play().catch(() => {});
    const fermer = () => { v.pause(); v.removeAttribute("src"); v.load(); l.classList.remove("on"); document.body.classList.remove("modal-ouverte"); document.removeEventListener("keydown", esc); setTimeout(() => l.remove(), 400); n.focus({ preventScroll: true }); };
    const esc = e => { if (e.key === "Escape") fermer(); };
    l.querySelector("button").addEventListener("click", fermer);
    l.addEventListener("click", e => { if (e.target === l) fermer(); });
    document.addEventListener("keydown", esc);
    l.querySelector("button").focus();
  }
  n.addEventListener("click", ouvrirVideo);
  n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirVideo(); } });

  // La carte ne doit recouvrir aucun bouton ni lien : on attend que la zone soit dégagée (par exemple après un défilement).
  function zoneDegagee() {
    n.classList.add("mesure"); const r = n.getBoundingClientRect(); n.classList.remove("mesure");
    for (const e of document.querySelectorAll("a[href], button, [role=button], input, textarea, select")) {
      if (n.contains(e) || !e.offsetParent && getComputedStyle(e).position !== "fixed") continue;
      const q = e.getBoundingClientRect();
      if (q.width * q.height > 90000) continue; // grandes images cliquables (plateau, cartes) : pas des boutons
      if (q.width && q.height && q.right > r.left - 8 && q.left < r.right + 8 && q.bottom > r.top - 8 && q.top < r.bottom + 8) return false;
    }
    return true;
  }
  function montrer() {
    if (!n.isConnected) document.body.appendChild(n);
    if (lire()) { n.classList.add("on", "repli"); return; }
    if (!zoneDegagee()) { setTimeout(attendre, 1500); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add("on")));
    tempo = setTimeout(replier, 14000);
  }
  // Quelques secondes après l'arrivée, et seulement quand aucune fenêtre (réservation, agent, vidéo) n'est ouverte.
  const libre = () => !document.body.classList.contains("modal-ouverte") && !document.querySelector(".cg-voile.on");
  const attendre = () => (libre() ? montrer() : setTimeout(attendre, 1500));
  setTimeout(attendre, lire() ? 600 : 4500);
})();

/* Bureau des Légendes — habillage du portail membre (Spaces OS).
   Chargé par le bloc « Script » du plan de page personal-dashboard.
   Ne modifie aucune donnée : uniquement du style et quelques éléments décoratifs. */
(function () {
  if (window.__bdlPortail) return;
  window.__bdlPortail = true;

  var BASE = "https://bdl.workplay.fr";
  var doc = document;

  /* Police Jost, celle du site vitrine */
  if (!doc.querySelector('link[data-bdl="font"]')) {
    var pc = doc.createElement("link");
    pc.rel = "preconnect"; pc.href = "https://fonts.gstatic.com"; pc.crossOrigin = "";
    var lf = doc.createElement("link");
    lf.rel = "stylesheet"; lf.setAttribute("data-bdl", "font");
    lf.href = "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap";
    doc.head.appendChild(pc); doc.head.appendChild(lf);
  }

  var CSS = `
:root{
  --bdl-noir:#19110B; --bdl-creme:#F6F1EB; --bdl-sable:#E9E1D6; --bdl-gris:#6B635C; --bdl-bleu:#3C6A9E;
  --bdl-f:"Jost",system-ui,sans-serif; --bdl-ease:cubic-bezier(.2,.7,.1,1);
}
html.bdl body, html.bdl{ --bs-body-font-family:var(--bdl-f); --bs-font-sans-serif:var(--bdl-f); }
html.bdl body{ font-family:var(--bdl-f) !important; color:var(--bdl-noir); -webkit-font-smoothing:antialiased; }
html.bdl h1,html.bdl h2,html.bdl h3,html.bdl h4,html.bdl h5,html.bdl h6,
html.bdl .btn,html.bdl .nav-link,html.bdl input,html.bdl select,html.bdl textarea{ font-family:var(--bdl-f) !important; }

/* En-tête : blanc, filet fin, liens en capitales espacées */
html.bdl header.fixed-header{ background:rgba(255,255,255,.92) !important; backdrop-filter:saturate(1.4) blur(14px); -webkit-backdrop-filter:saturate(1.4) blur(14px); border-bottom:1px solid var(--bdl-sable); }
html.bdl header .navbar-nav .nav-link{ text-transform:uppercase; letter-spacing:.14em; font-size:.72rem; font-weight:500; color:var(--bdl-noir) !important; }
html.bdl header .navbar-nav .nav-link:hover{ color:var(--bdl-gris) !important; }

/* Boutons sobres, rectangulaires */
html.bdl .btn{ border-radius:2px !important; letter-spacing:.08em; font-weight:500; }
html.bdl .btn-primary{ background:var(--bdl-noir) !important; border-color:var(--bdl-noir) !important; color:#fff !important; text-transform:uppercase; font-size:.72rem; padding:.6rem 1.1rem; }
html.bdl .btn-primary:hover{ background:#000 !important; }
html.bdl .btn-outline-primary{ border-color:var(--bdl-noir) !important; color:var(--bdl-noir) !important; text-transform:uppercase; font-size:.72rem; }
html.bdl .btn-outline-primary:hover{ background:var(--bdl-noir) !important; color:#fff !important; }
html.bdl .btn-link{ color:var(--bdl-noir) !important; text-underline-offset:4px; }

/* ===== Tableau de bord ===== */
html.bdl-dash .user-main-content{ background:var(--bdl-creme); }
html.bdl-dash .dashboard-content-container .container{ max-width:1440px; }

/* Bandeau : photo animée, voile, salutation */
.bdl-hero{ position:relative; overflow:hidden; background-image:none !important; background-color:var(--bdl-noir) !important;
  border-radius:0 0 28px 28px !important; min-height:clamp(420px,58vh,640px); display:flex; flex-direction:column; justify-content:flex-end; }
.bdl-hero-bg{ position:absolute; inset:-4%; background-size:cover; background-position:center; transform-origin:60% 40%;
  animation:bdlZoom 38s ease-in-out infinite alternate; opacity:0; transition:opacity 1.4s var(--bdl-ease); }
.bdl-hero-bg.on{ opacity:1; }
@keyframes bdlZoom{ from{ transform:scale(1) translate3d(0,0,0);} to{ transform:scale(1.12) translate3d(-1.5%,1%,0);} }
.bdl-hero-voile{ position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(180deg,rgba(25,17,11,.55) 0%,rgba(25,17,11,.15) 34%,rgba(25,17,11,.55) 66%,rgba(25,17,11,.92) 100%); }
.bdl-hero-grain{ position:absolute; inset:0; pointer-events:none; opacity:.08; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.bdl-hero > .z-index-1{ position:relative; z-index:2; }
.bdl-salut{ position:relative; z-index:2; color:#fff; width:100%; max-width:1440px; margin:0 auto; padding:clamp(3.5rem,9vh,6.5rem) calc(var(--bs-gutter-x,1.5rem)*.5) 0; }
.bdl-sur{ display:flex; align-items:center; gap:.9rem; font-size:.7rem; letter-spacing:.28em; text-transform:uppercase; font-weight:500; opacity:0; animation:bdlMonte .9s var(--bdl-ease) .15s forwards; }
.bdl-sur i{ display:inline-block; width:38px; height:1px; background:rgba(255,255,255,.7); transform-origin:left; transform:scaleX(0); animation:bdlTrait 1s var(--bdl-ease) .35s forwards; }
.bdl-titre{ margin:.9rem 0 0; font-weight:500 !important; font-size:clamp(2.6rem,5.6vw,5.2rem) !important; line-height:1.02 !important; letter-spacing:-.015em; color:#fff !important; }
.bdl-titre .m{ display:inline-block; overflow:hidden; vertical-align:bottom; padding:.06em .02em .12em; margin-bottom:-.12em; }
.bdl-titre .m > span{ display:inline-block; transform:translateY(105%); animation:bdlMot 1.05s var(--bdl-ease) forwards; }
.bdl-titre em{ font-style:italic; font-weight:400; }
.bdl-sous{ margin-top:1rem; max-width:40rem; font-size:1rem; line-height:1.6; color:rgba(255,255,255,.78); opacity:0; animation:bdlMonte 1s var(--bdl-ease) .9s forwards; }
@keyframes bdlMot{ to{ transform:translateY(0);} }
@keyframes bdlMonte{ from{ opacity:0; transform:translateY(14px);} to{ opacity:1; transform:none;} }
@keyframes bdlTrait{ to{ transform:scaleX(1);} }
.bdl-hero .container.vstack{ padding-top:2rem !important; }

/* Annonce : carte crème au-dessus de la photo */
.bdl-hero .announcement-banner{ background:rgba(246,241,235,.96) !important; border:0 !important; border-radius:6px !important; box-shadow:0 30px 60px -30px rgba(0,0,0,.6); }
.bdl-hero .announcement-banner img{ border-radius:4px !important; object-fit:cover; }
.bdl-hero .announcement-banner .card-title{ font-weight:400; font-size:1.15rem; }

/* Actions rapides : verre fumé */
.bdl-hero .quick-actions-title{ font-weight:400 !important; font-size:.72rem !important; letter-spacing:.28em; text-transform:uppercase; color:rgba(255,255,255,.85) !important; margin-bottom:1rem !important; }
.bdl-hero .quick-actions-banner-container .card,
.bdl-hero .quick-actions-banner-container a.card,
.bdl-hero .quick-actions-banner-container .row > div > *{ background:rgba(255,255,255,.08) !important; color:#fff !important;
  border:1px solid rgba(255,255,255,.22) !important; border-radius:6px !important; box-shadow:none !important;
  backdrop-filter:blur(16px) saturate(1.2); -webkit-backdrop-filter:blur(16px) saturate(1.2);
  transition:background .35s var(--bdl-ease), transform .35s var(--bdl-ease), border-color .35s; }
.bdl-hero .quick-actions-banner-container .row > div > *:hover{ background:rgba(255,255,255,.18) !important; border-color:rgba(255,255,255,.5) !important; transform:translateY(-3px); }
.bdl-hero .quick-actions-banner-container *{ color:#fff !important; }
.bdl-hero .quick-actions-banner-container .row > div > * [class*="bg-"]{ background:rgba(255,255,255,.14) !important; border-radius:4px !important; }
.bdl-hero .quick-actions-banner-container .row > div{ opacity:0; animation:bdlMonte .8s var(--bdl-ease) forwards; }
.bdl-hero .quick-actions-banner-container .row > div:nth-child(1){ animation-delay:1.05s; }
.bdl-hero .quick-actions-banner-container .row > div:nth-child(2){ animation-delay:1.15s; }
.bdl-hero .quick-actions-banner-container .row > div:nth-child(3){ animation-delay:1.25s; }
.bdl-hero .quick-actions-banner-container .row > div:nth-child(n+4){ animation-delay:1.35s; }
.bdl-hero .icon{ background-color:#fff !important; }

/* Titres de section numérotés */
html.bdl-dash .dashboard-content-container h3.card-header-title,
html.bdl-dash .bdl-grille h3.card-header-title, html.bdl-dash .bdl-pleine h3.card-header-title{ font-weight:600 !important; font-size:clamp(1.15rem,1.5vw,1.4rem) !important; letter-spacing:.08em; text-transform:uppercase; line-height:1.2; }
html.bdl-dash .user-main-content .card h5, html.bdl-dash .user-main-content .card h6, html.bdl-dash .user-main-content .card .fw-bolder, html.bdl-dash .user-main-content .card .fw-semibold, html.bdl-dash .user-main-content .card .fw-bold{ font-family:var(--bdl-f) !important; font-weight:600 !important; letter-spacing:.01em; }
html.bdl-dash .user-main-content .card .fw-medium{ font-weight:500 !important; }
html.bdl-dash .dashboard-content-container h3.card-header-title::before{ counter-increment:bdlsec; content:none; display:none;
  font-size:.66rem; letter-spacing:.28em; font-weight:500; color:var(--bdl-gris); margin-bottom:.55rem; white-space:pre; }
html.bdl-dash .user-main-content a.text-body{ font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; font-weight:500; text-decoration:none; border-bottom:1px solid currentColor; padding-bottom:2px; }

/* Cartes : blanc, filet fin, plus d'ombre floue */
html.bdl-dash .dashboard-content-container > .container .card,
html.bdl-dash .bdl-grille .card, html.bdl-dash .bdl-pleine .card{ border:1px solid var(--bdl-sable) !important; border-radius:6px !important; box-shadow:none !important; background:#fff; transition:border-color .3s, transform .4s var(--bdl-ease), box-shadow .4s var(--bdl-ease); }
html.bdl-dash .dashboard-content-container > .container .card:hover, html.bdl-dash .bdl-grille .card:hover, html.bdl-dash .bdl-pleine .card:hover{ border-color:#d6cbbd !important; box-shadow:0 24px 40px -32px rgba(25,17,11,.45) !important; }
html.bdl-dash .benefit-row{ background:var(--bdl-creme) !important; border-radius:4px !important; }
html.bdl-dash .benefit-badge{ background:var(--bdl-noir) !important; color:#fff !important; border-radius:2px !important; }
html.bdl-dash .benefit-badge *{ color:#fff !important; letter-spacing:.06em; }
html.bdl-dash .rounded-4{ border-radius:6px !important; }
html.bdl-dash .rounded-3{ border-radius:4px !important; }
html.bdl-dash .bg-light{ background-color:var(--bdl-creme) !important; }
html.bdl-dash .badge{ border-radius:2px !important; letter-spacing:.06em; font-weight:500; }

/* Grille en deux colonnes (bloc CustomGrid du plan de page) */
.container.bdl-grille,.container.bdl-pleine{ max-width:1440px; }
.bdl-grille{ margin-bottom:5.5rem; }
.bdl-grille > .row{ --bs-gutter-x:3.5rem; --bs-gutter-y:3.5rem; }
.bdl-grille > .row > [class*="col"]{ display:flex; flex-direction:column; gap:4rem; }
@media (min-width:992px){
  .bdl-grille > .row > .col-lg-4{ align-self:flex-start; position:sticky; top:104px; }
  .bdl-grille > .row > .col-lg-8{ border-right:1px solid var(--bdl-sable); padding-right:calc(var(--bs-gutter-x) * .5 + 1rem); }
}
/* Colonne de droite : une carte par ligne */
.bdl-grille .col-lg-4 .row > *{ flex:0 0 100% !important; max-width:100% !important; width:100% !important; }
.bdl-grille .col-lg-4 [class*="row-cols"] > *{ flex:0 0 100% !important; max-width:100% !important; }
.bdl-grille .col-lg-4 .mb-2[style*="grid"], .bdl-grille .col-lg-4 div.mb-2{ grid-template-columns:1fr !important; }
.bdl-grille .col-lg-4 .card{ width:100%; }
.bdl-pleine{ margin-bottom:6rem; padding-top:4rem; border-top:1px solid var(--bdl-sable); display:flex; flex-direction:column; gap:5rem; }
.bdl-pleine h3,.bdl-pleine h2{ font-weight:600 !important; }
.bdl-grille h3.card-header-title::before,.bdl-pleine h3.card-header-title::before{ counter-increment:bdlsec; content:none; display:none;
  font-size:.66rem; letter-spacing:.28em; font-weight:500; color:var(--bdl-gris); margin-bottom:.55rem; white-space:pre; }
html.bdl-dash .user-main-content{ counter-reset:bdlsec; }

/* Apparition au défilement */
.bdl-rev{ opacity:0; transform:translateY(28px); transition:opacity 1s var(--bdl-ease), transform 1s var(--bdl-ease); }
.bdl-rev.vu{ opacity:1; transform:none; }

/* Rideau d'entrée, comme sur le site */
.bdl-rideau{ position:fixed; inset:0; z-index:99999; background:var(--bdl-noir); display:grid; place-items:center; pointer-events:none;
  animation:bdlRideau 1.25s cubic-bezier(.77,0,.18,1) .45s forwards; }
.bdl-rideau img{ width:56px; opacity:0; animation:bdlMonte .5s ease forwards; }
@keyframes bdlRideau{ to{ transform:translateY(-100%);} }


/* === Correctifs démo === */
img.bdl-logo{ width:140px !important; max-width:140px !important; height:100% !important; object-fit:contain !important; padding:18px !important; background:#fff !important; }
/* 1. Annonce intégrée au bandeau */
.bdl-hero .announcement-banner{ background:rgba(25,17,11,.45) !important; border:1px solid rgba(255,255,255,.22) !important; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:none !important; padding:1rem; gap:1.25rem; }
.bdl-hero .announcement-banner *{ color:#fff !important; }
.bdl-hero .announcement-banner .card-header,.bdl-hero .announcement-banner .card-body{ background:transparent !important; padding-left:0 !important; padding-right:0 !important; }
.bdl-hero .announcement-banner .card-body{ flex-grow:0 !important; gap:1rem; }
.bdl-hero .announcement-banner .order-md-2{ max-width:240px; }
.bdl-hero .announcement-banner .btn-primary{ background:#fff !important; border-color:#fff !important; color:var(--bdl-noir) !important; }
.bdl-hero .announcement-banner .btn-primary *{ color:var(--bdl-noir) !important; }
/* 2. Pastilles du calendrier */
html.bdl-dash .bdl-grille .col-lg-8 .card .bg-light, html.bdl-dash .bdl-grille [class*="bg-secondary"], html.bdl-dash .bdl-grille .bg-body-secondary, html.bdl-dash .bdl-grille .bg-body-tertiary{ background:var(--bdl-sable) !important; }
html.bdl-dash .bdl-grille .col-lg-8 .text-truncate{ white-space:normal !important; overflow:visible !important; text-overflow:clip !important; }
/* 3. Badges unifiés */
html.bdl-dash .user-main-content .badge, html.bdl-dash .user-main-content [class*="-subtle"], html.bdl-dash .benefit-badge{
  background:transparent !important; color:var(--bdl-noir) !important; border:1px solid var(--bdl-noir) !important; border-radius:2px !important; font-weight:500 !important; letter-spacing:.08em; }
html.bdl-dash .user-main-content .badge *, html.bdl-dash .user-main-content [class*="-subtle"] *, html.bdl-dash .benefit-badge *{ color:var(--bdl-noir) !important; }
html.bdl-dash .bdl-pleine .badge, html.bdl-dash .bdl-pleine [class*="bg-info"]{ background:rgba(255,255,255,.92) !important; border-color:transparent !important; color:var(--bdl-noir) !important; }
/* 4. Liens « Voir tous » sur la ligne du titre */
html.bdl-dash .bdl-grille .col-lg-4 .d-flex.flex-column.align-items-start{ flex-direction:row !important; align-items:baseline !important; justify-content:space-between !important; width:100%; }
/* 5. En-tête */
html.bdl header .navbar-nav .nav-link{ text-transform:none !important; letter-spacing:.02em !important; font-size:.92rem !important; font-weight:500 !important; }
html.bdl header .navbar-nav .nav-link svg, html.bdl header .navbar-nav .nav-link img, html.bdl header .navbar-nav .nav-link .icon{ display:none !important; }
html.bdl header .avatar, html.bdl header [class*="avatar"]{ background:var(--bdl-noir) !important; color:#fff !important; border-radius:50% !important; }
html.bdl .ai-chat-manager, html.bdl header .btn:last-child{ margin-right:.5rem; }
@media (max-width:767px){
  .bdl-hero{ border-radius:0 0 18px 18px !important; min-height:0; }
  .bdl-salut{ padding-top:3rem; }
}
@media (prefers-reduced-motion:reduce){
  .bdl-hero-bg,.bdl-titre .m > span,.bdl-sur,.bdl-sur i,.bdl-sous,.bdl-hero .quick-actions-banner-container .row > div,.bdl-rideau{ animation:none !important; opacity:1; transform:none; }
  .bdl-rideau{ display:none; } .bdl-rev{ opacity:1; transform:none; }
}
`;
  var st = doc.createElement("style");
  st.setAttribute("data-bdl", "skin");
  st.textContent = CSS;
  doc.head.appendChild(st);
  doc.documentElement.classList.add("bdl");

  /* Rideau une fois par session */
  try {
    if (!sessionStorage.getItem("bdl_rideau") && /\/user\/dashboard/.test(location.pathname)) {
      sessionStorage.setItem("bdl_rideau", "1");
      var r = doc.createElement("div");
      r.className = "bdl-rideau";
      r.innerHTML = '<img src="' + BASE + '/img/mark-blanc.png" alt="">';
      doc.body.appendChild(r);
      setTimeout(function () { r.remove(); }, 2000);
    }
  } catch (e) {}

  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function heureParis() {
    try {
      var p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(new Date());
      var h = parseInt((p.find(function (x) { return x.type === "hour"; }) || {}).value, 10);
      if (!isNaN(h)) return h;
    } catch (e) {}
    return new Date().getHours();
  }
  function salutation() {
    var h = heureParis();
    if (h < 5) return ["Belle", "<em>nuit</em>", "au", "Bureau."];
    if (h < 12) return ["Bonjour,", "et", "bienvenue", "au", "<em>Bureau.</em>"];
    if (h < 18) return ["Bel", "après-midi", "au", "<em>Bureau.</em>"];
    return ["Bonsoir,", "la", "verrière", "vous", "<em>attend.</em>"];
  }

  function habillerBandeau(hero) {
    if (hero.dataset.bdl) return;
    hero.dataset.bdl = "1";
    hero.classList.add("bdl-hero");
    var h = heureParis();
    var photo = BASE + "/img/" + (h >= 8 && h < 17 ? "verriere-jour.jpg" : "verriere-nuit.jpg");
    var bg = doc.createElement("div"); bg.className = "bdl-hero-bg"; bg.style.backgroundImage = "url(" + photo + ")";
    var im = new Image(); im.onload = function () { bg.classList.add("on"); }; im.src = photo;
    var voile = doc.createElement("div"); voile.className = "bdl-hero-voile";
    var grain = doc.createElement("div"); grain.className = "bdl-hero-grain";
    var d = new Date();
    var date = JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()];
    var mots = salutation().map(function (m, i) {
      return '<span class="m"><span style="animation-delay:' + (0.35 + i * 0.09).toFixed(2) + 's">' + m + "</span></span>";
    }).join(" ");
    var s = doc.createElement("div"); s.className = "bdl-salut";
    s.innerHTML = '<div class="bdl-sur"><span>' + date + '</span><i></i><span>34, bd Haussmann · Paris IX<sup>e</sup></span></div>' +
      '<h1 class="bdl-titre">' + mots + "</h1>" +
      '<p class="bdl-sous">Vos réservations, vos invités et la vie du lieu, réunis sur une seule page.</p>';
    hero.insertBefore(grain, hero.firstChild);
    hero.insertBefore(voile, hero.firstChild);
    hero.insertBefore(bg, hero.firstChild);
    var contenu = hero.querySelector(".z-index-1");
    hero.insertBefore(s, contenu || null);
  }

  var obs = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vu"); obs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  function reveler(el, i) {
    if (!obs || el.dataset.bdlRev) return;
    el.dataset.bdlRev = "1";
    el.classList.add("bdl-rev");
    el.style.transitionDelay = (Math.min(i, 4) * 0.08) + "s";
    obs.observe(el);
  }

  function appliquer() {
    var dash = /\/user\/dashboard/.test(location.pathname);
    doc.documentElement.classList.toggle("bdl-dash", dash);
    if (!dash) return;
    var c = doc.querySelector(".dashboard-content-container");
    if (!c) return;
    var hero = c.querySelector(":scope > .position-relative.rounded-4");
    if (hero) {
      if (hero.dataset.bdl && !hero.querySelector(".bdl-salut")) delete hero.dataset.bdl;
      habillerBandeau(hero);
    }
    c.querySelectorAll(":scope > .container > .vstack > div").forEach(reveler);
    doc.querySelectorAll(".bdl-grille > .row > [class*=col] > * > *, .bdl-pleine > *").forEach(reveler);
    /* Logos de partenaires : affichés entiers, sans recadrage */
    doc.querySelectorAll(".bdl-pleine .card").forEach(function (cd) {
      var t = (cd.innerText || "").trim();
      if (!/^Uber\b/.test(t)) return;
      var img = cd.querySelector("img");
      if (!img || img.dataset.bdlLogo) return;
      img.dataset.bdlLogo = "1";
      img.classList.add("bdl-logo");
      try { var u = new URL(img.src); u.searchParams.set("mode", "pad"); u.searchParams.set("w", "600"); u.searchParams.set("h", "600"); img.src = u.toString(); } catch (e) {}
    });
  }

  var attente = 0;
  new MutationObserver(function () {
    if (attente) return;
    attente = requestAnimationFrame(function () { attente = 0; appliquer(); });
  }).observe(doc.body, { childList: true, subtree: true });
  appliquer();
})();

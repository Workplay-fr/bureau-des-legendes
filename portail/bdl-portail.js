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
html.bdl-dash .user-main-content .card-header-title + div a.text-body, html.bdl-dash .user-main-content .d-flex.flex-column.align-items-start > div > a.text-body{ font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; font-weight:500; text-decoration:none; border-bottom:1px solid currentColor; padding-bottom:2px; }

/* Cartes : blanc, filet fin, plus d'ombre floue */
html.bdl-dash .dashboard-content-container > .container .card,
html.bdl-dash .bdl-grille .card, html.bdl-dash .bdl-pleine .card{ border:1px solid var(--bdl-sable) !important; border-radius:6px !important; box-shadow:none !important; background:#fff; transition:border-color .3s, transform .4s var(--bdl-ease), box-shadow .4s var(--bdl-ease); }
html.bdl-dash .dashboard-content-container > .container .card:hover, html.bdl-dash .bdl-grille .card:hover, html.bdl-dash .bdl-pleine .card:hover{ border-color:#d6cbbd !important; box-shadow:0 24px 40px -32px rgba(25,17,11,.45) !important; }
html.bdl-dash .benefit-row{ background:var(--bdl-creme) !important; border-radius:4px !important; }
html.bdl-dash .benefit-badge{ background:var(--bdl-noir) !important; color:#fff !important; border-radius:2px !important; }
html.bdl-dash .benefit-badge *{ color:#fff !important; letter-spacing:.06em; }
html.bdl-dash .rounded-4{ border-radius:6px !important; }
html.bdl-dash .rounded-3{ border-radius:4px !important; }
html.bdl-dash .user-main-content .bg-light{ background-color:#fff !important; }
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
img.bdl-logo{ object-fit:cover !important; }
/* 1. Annonce intégrée au bandeau */
.bdl-hero .announcement-banner{ background:rgba(25,17,11,.45) !important; border:1px solid rgba(255,255,255,.22) !important; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:none !important; padding:1rem; gap:1.25rem; }
.bdl-hero .announcement-banner *{ color:#fff !important; }
.bdl-hero .announcement-banner .card-header,.bdl-hero .announcement-banner .card-body{ background:transparent !important; padding-left:0 !important; padding-right:0 !important; }
.bdl-hero .announcement-banner .card-body{ flex-grow:0 !important; gap:1rem; }
.bdl-hero .announcement-banner .order-md-2{ max-width:240px; }
.bdl-hero .announcement-banner .btn-primary{ background:#fff !important; border-color:#fff !important; color:var(--bdl-noir) !important; }
.bdl-hero .announcement-banner .btn-primary *{ color:var(--bdl-noir) !important; }
/* 2. Pastilles du calendrier */

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

/* === Passe 2 === */
/* En-tête sur la grille de la page */
html.bdl header nav .container{ max-width:1440px !important; }
@media (min-width:1200px){ html.bdl .mobile-aichatManager{ right:max(1rem, calc((100vw - 1440px) / 2 + 12px)) !important; margin-right:0 !important; } html.bdl header nav .container{ padding-right:calc(var(--bs-gutter-x,1.5rem) * .5 + 176px) !important; } }
/* Bandeau plus compact */
.bdl-hero{ min-height:0 !important; margin-bottom:3.5rem !important; }
.bdl-salut{ padding-top:clamp(2.5rem,6vh,4rem) !important; }
.bdl-hero .container.vstack{ padding-top:1.75rem !important; padding-bottom:2.5rem !important; margin-bottom:0 !important; gap:1.75rem !important; }
.bdl-hero .announcement-banner{ align-items:center; }
.bdl-hero .announcement-banner .order-md-2 img{ height:132px !important; width:220px !important; }
.bdl-hero .announcement-banner .order-md-1{ justify-content:center; }
.bdl-hero .announcement-banner .card-body{ padding-bottom:0 !important; }
.bdl-hero .announcement-banner .d-flex.mt-auto{ margin-top:.25rem !important; align-items:center; gap:.75rem; }
html.bdl .bdl-hero .announcement-banner .btn-link, html.bdl .bdl-hero .announcement-banner .btn-link *{ color:rgba(255,255,255,.85) !important; }
/* Calendrier */
html.bdl-dash .fc-upcoming-agenda-calendar{ background:#FCFAF7 !important; }
html.bdl-dash .bdl-grille .card:has(.fc-upcoming-agenda-calendar){ background:#FCFAF7 !important; box-shadow:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-theme-standard td, html.bdl-dash .fc-upcoming-agenda-calendar .fc-theme-standard th,
html.bdl-dash .fc-upcoming-agenda-calendar .fc-scrollgrid{ border-color:var(--bdl-sable) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today{ background:rgba(233,225,214,.35) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event{ background:var(--bdl-sable) !important; border:0 !important; border-left:2px solid var(--bdl-noir) !important; border-radius:3px !important; box-shadow:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event:hover{ background:#DED3C4 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event a{ border:0 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .icon{ background-color:var(--bdl-noir) !important; }
/* Calendrier, finition */
html.bdl-dash .fc-upcoming-agenda-calendar .fc-view-harness{ height:236px !important; }
html.bdl-dash .fc-upcoming-agenda-calendar, html.bdl-dash .fc-upcoming-agenda-calendar > .fc, html.bdl-dash .bdl-grille .card:has(.fc-upcoming-agenda-calendar){ height:auto !important; min-height:0 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-scrollgrid-sync-table{ height:auto !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-daygrid-day-frame{ min-height:150px; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-scroller{ scrollbar-width:none; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-scroller::-webkit-scrollbar{ display:none; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell{ text-align:left; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell *{ text-transform:uppercase; letter-spacing:.16em; font-size:.68rem; font-weight:500; color:var(--bdl-gris); }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell h5, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell .fs-4, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell .fw-bold, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell .fw-bolder{ font-size:1.6rem !important; letter-spacing:0 !important; font-weight:300 !important; color:var(--bdl-noir) !important; text-transform:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today{ background:rgba(233,225,214,.45) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today h5, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today .fw-bold, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today .fw-bolder{ font-weight:500 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-daygrid-event-harness{ margin:10px 10px 0 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event{ margin:0 !important; padding:10px 12px !important; border-left:0 !important; background:#fff !important; box-shadow:0 0 0 1px var(--bdl-sable) !important; border-radius:4px !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event:hover{ background:#fff !important; box-shadow:0 0 0 1px var(--bdl-noir) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .d-flex.gap-1 > div:last-child > div:nth-child(3){ display:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .fw-bolder{ font-weight:600 !important; font-size:.82rem; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .fs-xs{ color:var(--bdl-gris) !important; }
/* Cartes : un seul système (blanc, filet sable) */
html.bdl-dash .user-main-content .card.bg-light, html.bdl-dash .user-main-content .card .card.bg-light{ background:#fff !important; }
html.bdl-dash .bdl-pleine .card .card-img-overlay > .d-flex > .card, html.bdl-dash .bdl-grille .card .card-img-overlay > .d-flex > .card{ border:0 !important; border-left:1px solid var(--bdl-sable) !important; border-radius:0 !important; }
/* Coins : la carte découpe son image, un seul arrondi */
html.bdl-dash .bdl-grille .card, html.bdl-dash .bdl-pleine .card{ overflow:hidden !important; border:0 !important; box-shadow:0 0 0 1px var(--bdl-sable) !important; }
html.bdl-dash .bdl-grille .card:hover, html.bdl-dash .bdl-pleine .card:hover{ box-shadow:0 0 0 1px #d6cbbd, 0 24px 40px -32px rgba(25,17,11,.45) !important; }
html.bdl-dash .bdl-grille .card .card, html.bdl-dash .bdl-pleine .card .card{ box-shadow:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-view-harness, html.bdl-dash .fc-upcoming-agenda-calendar .fc-scrollgrid{ border-radius:0 !important; }
html.bdl-dash .bdl-grille .card img, html.bdl-dash .bdl-pleine .card img,
html.bdl-dash .bdl-grille .card .card-img, html.bdl-dash .bdl-pleine .card .card-img,
html.bdl-dash .bdl-grille .card .card-img-overlay, html.bdl-dash .bdl-pleine .card .card-img-overlay,
html.bdl-dash .bdl-grille .card .card, html.bdl-dash .bdl-pleine .card .card{ border-radius:0 !important; }
/* Événements à la une : colonnes de même hauteur */
html.bdl-dash .bdl-pleine .row{ align-items:stretch; }
html.bdl-dash .bdl-pleine .row > * > .card, html.bdl-dash .bdl-pleine .row > * > a > .card{ height:100%; }

/* === Passe 3 : grille unique et rythme === */
:root{ --bdl-pad:40px; --bdl-max:1280px; --bdl-sec:80px; }
@media (max-width:767px){ :root{ --bdl-pad:20px; --bdl-sec:56px; } }
html.bdl header nav .container,
html.bdl-dash .bdl-hero .container, html.bdl-dash .bdl-salut,
html.bdl-dash .container.bdl-grille, html.bdl-dash .container.bdl-pleine,
html.bdl-dash .dashboard-content-container > .container,
html.bdl .bdl-pied-c{ max-width:var(--bdl-max) !important; width:100%; margin-left:auto !important; margin-right:auto !important;
  padding-left:var(--bdl-pad) !important; padding-right:var(--bdl-pad) !important; }
@media (min-width:1200px){
  html.bdl header nav .container{ padding-right:calc(var(--bdl-pad) + 200px) !important; }
  html.bdl .mobile-aichatManager{ right:max(var(--bdl-pad), calc((100% - var(--bdl-max)) / 2 + var(--bdl-pad))) !important; margin-right:0 !important; margin-left:0 !important; }
  html.bdl .mobile-aichatManager .ai-chat-manager{ right:0 !important; }
}
/* Rythme : un seul espacement entre sections */
.bdl-hero{ margin-bottom:var(--bdl-sec) !important; }
html.bdl-dash .dashboard-content-container > .container > .vstack{ margin-bottom:0 !important; }
html.bdl-dash .dashboard-content-container > .container > .vstack:empty{ display:none !important; }
.bdl-grille{ margin-bottom:var(--bdl-sec) !important; }
.bdl-grille > .row{ --bs-gutter-y:var(--bdl-sec) !important; }
.bdl-grille > .row > [class*="col"]{ gap:var(--bdl-sec) !important; }
.bdl-pleine{ padding-top:var(--bdl-sec) !important; margin-bottom:var(--bdl-sec) !important; gap:var(--bdl-sec) !important; }
/* Hauteur réservée : pas de saut au chargement */
.bdl-grille .col-lg-4 > div > :first-child{ min-height:150px; }
/* Colonne de droite : lien « Voir tout » à droite du titre */
.bdl-grille .col-lg-4 .w-100.d-flex.flex-wrap{ flex-wrap:nowrap !important; align-items:baseline !important; }
.bdl-grille .col-lg-4 .card-header-title + div{ flex-shrink:0; white-space:nowrap; }
@media (min-width:768px){
  .bdl-grille .col-lg-4 .card-header-title + div .d-md-inline{ display:none !important; }
  .bdl-grille .col-lg-4 .card-header-title + div .d-md-none{ display:inline !important; }
}
html.bdl-dash .fc-upcoming-agenda-calendar table.fc-col-header, html.bdl-dash .fc-upcoming-agenda-calendar table.fc-scrollgrid-sync-table{ min-width:var(--bdl-calw, 3780px) !important; width:var(--bdl-calw, 3780px) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar col{ min-width:0 !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .flex-grow-0{ display:none !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event{ padding:8px 10px !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-daygrid-event-harness{ margin:8px 8px 0 !important; }
/* Cartes en grille : jamais plus larges que la colonne */
html.bdl-dash .bdl-grille div.mb-2, html.bdl-dash .bdl-pleine div.mb-2{ grid-template-columns:repeat(auto-fill, minmax(min(100%, 300px), 1fr)) !important; }
html.bdl-dash .bdl-grille .col-lg-4 div.mb-2{ grid-template-columns:1fr !important; }
@media (max-width:767px){
  html.bdl-dash .bdl-grille div.mb-2, html.bdl-dash .bdl-pleine div.mb-2{ grid-template-columns:1fr !important; }
  .bdl-hero .announcement-banner .order-md-2{ display:none !important; }
  html.bdl-dash .user-main-content .badge, html.bdl-dash .user-main-content [class*="-subtle"]{ white-space:normal !important; max-width:100%; font-size:.68rem; }
}
/* Calendrier : libellés sur une ligne avec ellipse */
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .text-truncate, html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .fw-bolder{ white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; min-width:0; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event .d-flex.gap-1 > div:last-child{ min-width:0; overflow:hidden; }
/* Événements à la une : deux cartes identiques */
.bdl-pleine [class*="_scroller_"]{ overflow:visible !important; }
.bdl-pleine [class*="_fade_"], .bdl-pleine [class*="_srOnly_"]{ display:none !important; }
.bdl-pleine [class*="_scroller_"] > div{ display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)); gap:32px !important; width:100% !important; align-items:stretch; }
.bdl-pleine [class*="_scroller_"] > div > div{ flex:none !important; width:auto !important; min-width:0; }
.bdl-pleine [class*="_scroller_"] a.card{ height:100%; background:#fff !important; border-radius:6px !important; overflow:hidden !important; gap:0 !important; box-shadow:0 0 0 1px var(--bdl-sable) !important; }
.bdl-pleine [class*="_scroller_"] a.card img{ width:100% !important; height:auto !important; aspect-ratio:16/9 !important; object-fit:cover !important; border-radius:0 !important; }
.bdl-pleine [class*="_scroller_"] a.card .card-body{ padding:20px 24px 24px !important; gap:12px !important; flex:1 1 auto; display:flex; flex-direction:column; }
.bdl-pleine [class*="_scroller_"] a.card .card-body > :last-child{ margin-top:auto; padding-top:8px; }
.bdl-pleine [class*="_scroller_"] a.card .card-title{ font-size:1.05rem !important; }
@media (max-width:767px){ .bdl-pleine [class*="_scroller_"] > div{ grid-template-columns:1fr; } }
/* Variante grand écran : grande carte + liste → deux cartes identiques */
.bdl-pleine .g-4.row{ --bs-gutter-x:32px; --bs-gutter-y:32px; align-items:stretch; }
.bdl-pleine .g-4.row > .col-lg-6{ display:flex; padding-left:calc(var(--bs-gutter-x) * .5) !important; padding-right:calc(var(--bs-gutter-x) * .5) !important; }
.bdl-pleine .g-4.row > .col-lg-6 > a.card, .bdl-pleine .g-4.row > .col-lg-6 > .vstack{ flex:1 1 auto; }
.bdl-pleine .g-4.row > .col-lg-6 > .vstack > a{ display:flex; flex:1 1 auto; }
.bdl-pleine .g-4.row > .col-lg-6 > a.card, .bdl-pleine .g-4.row > .col-lg-6 > .vstack > a > .d-flex{
  width:100%; background:#fff !important; border-radius:6px !important; overflow:hidden !important; box-shadow:0 0 0 1px var(--bdl-sable) !important; gap:0 !important; }
.bdl-pleine .g-4.row > .col-lg-6 > .vstack > a > .d-flex{ flex-direction:column !important; }
.bdl-pleine .g-4.row > .col-lg-6 > .vstack > a > .d-flex > .flex-shrink-0{ width:100% !important; }
.bdl-pleine .g-4.row > .col-lg-6 img{ width:100% !important; height:auto !important; aspect-ratio:16/9 !important; object-fit:cover !important; border-radius:0 !important; max-width:none !important; }
.bdl-pleine .g-4.row > .col-lg-6 > a.card .card-body, .bdl-pleine .g-4.row > .col-lg-6 > .vstack > a > .d-flex > :last-child{
  padding:20px 24px 24px !important; gap:12px !important; flex:1 1 auto; display:flex; flex-direction:column; }
.bdl-pleine .g-4.row > .col-lg-6 > a.card .card-body > :last-child, .bdl-pleine .g-4.row > .col-lg-6 > .vstack > a > .d-flex > :last-child > :last-child{ margin-top:auto; padding-top:8px; }
.bdl-pleine .g-4.row > .col-lg-6 .card-title, .bdl-pleine .g-4.row > .col-lg-6 .h5, .bdl-pleine .g-4.row > .col-lg-6 h5{ font-size:1.05rem !important; text-transform:none !important; letter-spacing:.01em !important; }
.bdl-pleine .g-4.row > .col-lg-6 .six-lines, .bdl-pleine .g-4.row > .col-lg-6 [class*="truncate"]{ -webkit-line-clamp:2 !important; }
/* Avantages : même hauteur, actions en bas */
.bdl-pleine .row{ align-items:stretch; }
.bdl-pleine .row > * > .card{ height:100%; }
.bdl-pleine .card .card-body > .d-flex.flex-column.h-100{ height:100%; }
/* Actions rapides : icônes allégées */
.bdl-hero .quick-actions-banner-container [class*="-subtle"], .bdl-hero .quick-actions-banner-container .row > div > * [class*="bg-"]{
  background:transparent !important; border:0 !important; border-left:1px solid rgba(255,255,255,.16) !important; border-radius:0 !important; }
.bdl-hero .quick-actions-banner-container .icon{ background-color:transparent !important; }
.bdl-hero .quick-actions-banner-container .icon-masked{ background-color:#fff !important; }
.bdl-hero .quick-actions-banner-container .icon svg [fill]:not([fill="none"]){ fill:#fff !important; }
.bdl-hero .quick-actions-banner-container .icon svg [stroke]:not([stroke="none"]){ stroke:#fff !important; }
.bdl-hero .quick-actions-banner-container .icon svg rect[fill]:first-child{ fill:transparent !important; }
/* Demande-moi : libellé toujours visible */
html.bdl .ai-chat-manager.collapsed{ transform:scale(1) !important; width:auto !important; }
html.bdl .ai-chat-manager.collapsed .ai-chat-label{ max-width:none !important; opacity:1 !important; margin-left:.4rem; }
html.bdl .ai-chat-label{ white-space:nowrap; }
/* Calendrier : jours en blanc, aujourd'hui en verre sombre */
html.bdl-dash .fc-upcoming-agenda-calendar, html.bdl-dash .bdl-grille .card:has(.fc-upcoming-agenda-calendar),
html.bdl-dash .fc-upcoming-agenda-calendar td, html.bdl-dash .fc-upcoming-agenda-calendar th,
html.bdl-dash .fc-upcoming-agenda-calendar .fc-daygrid-day, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell{ background:#fff !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today, html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today,
html.bdl-dash .fc-upcoming-agenda-calendar td.fc-daygrid-day.fc-day-today{
  background:rgba(25,17,11,.82) !important; border-color:rgba(25,17,11,.86) !important;
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today *{ color:#fff !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-col-header-cell.fc-day-today :not(h5):not(.fs-4):not(.fw-bold):not(.fw-bolder){ color:rgba(255,255,255,.7) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event{ background:#F6F1EB !important; box-shadow:0 0 0 1px var(--bdl-sable) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-event:hover{ background:#EFE7DC !important; box-shadow:0 0 0 1px var(--bdl-noir) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today .fc-event{ background:rgba(255,255,255,.12) !important; box-shadow:0 0 0 1px rgba(255,255,255,.32) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today .fc-event:hover{ background:rgba(255,255,255,.2) !important; box-shadow:0 0 0 1px rgba(255,255,255,.6) !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today .fc-event *{ color:#fff !important; }
html.bdl-dash .fc-upcoming-agenda-calendar .fc-day-today .fc-event .fs-xs{ color:rgba(255,255,255,.72) !important; }
/* Assistant : bouton d'en-tête affirmé */
html.bdl .ai-chat-manager{ background:var(--bdl-noir) !important; color:#fff !important; border:1px solid var(--bdl-noir) !important; border-radius:999px !important;
  padding:.55rem 1.1rem !important; box-shadow:0 10px 28px -12px rgba(25,17,11,.55) !important; animation:bdlHalo 2.4s ease-out 1.5s 3; }
html.bdl .ai-chat-manager *{ color:#fff !important; }
html.bdl .ai-chat-manager svg [fill]:not([fill="none"]){ fill:#fff !important; }
html.bdl .ai-chat-manager svg [stroke]:not([stroke="none"]){ stroke:#fff !important; }
html.bdl .ai-chat-manager .ai-chat-label{ font-weight:500 !important; letter-spacing:.02em; }
html.bdl .ai-chat-manager:hover{ transform:translateY(-1px) !important; }
@keyframes bdlHalo{ 0%{ box-shadow:0 0 0 0 rgba(25,17,11,.45); } 100%{ box-shadow:0 0 0 14px rgba(25,17,11,0); } }
/* Assistant : fenêtre de discussion compacte, ancrée en bas à droite */
body:has(.ai-modal-dialog) .modal-backdrop.show{ opacity:.18 !important; }
html.bdl .modal:has(.ai-modal-dialog){ padding:0 !important; }
html.bdl .ai-modal-dialog{ position:fixed !important; right:24px; bottom:24px; margin:0 !important; width:400px; max-width:calc(100vw - 32px) !important; min-height:0 !important; transform:none !important; display:block !important; }
html.bdl .ai-modal-content{ height:min(600px, calc(100vh - 48px)); display:flex !important; flex-direction:column; border:0 !important; border-radius:18px !important; overflow:hidden;
  background:#F6F1EB !important; box-shadow:0 30px 70px -20px rgba(25,17,11,.45), 0 0 0 1px rgba(25,17,11,.06) !important; font-family:Jost, sans-serif; }
html.bdl .ai-modal-content .modal-header{ flex:0 0 auto; background:var(--bdl-noir) !important; color:#fff; padding:14px 16px 14px 20px !important; gap:10px; align-items:center; }
html.bdl .ai-modal-content .modal-header::before{ content:"Votre concierge"; order:0; font-size:1rem; font-weight:500; letter-spacing:.02em; color:#fff; margin-right:auto; }
html.bdl .ai-modal-content .modal-header .btn-outline-secondary{ order:1; margin:0 !important; border:1px solid rgba(255,255,255,.3) !important; color:#fff !important; background:transparent !important; border-radius:999px !important; font-size:.72rem !important; padding:.25rem .7rem !important; letter-spacing:.04em; }
html.bdl .ai-modal-content .modal-header .btn-outline-secondary:hover{ background:rgba(255,255,255,.12) !important; }
html.bdl .ai-modal-content .modal-header .btn-outline-secondary svg{ display:none; }
html.bdl .ai-modal-content .modal-header .btn-close{ order:2; filter:invert(1); opacity:.8; margin:0 !important; padding:.4rem !important; background-size:.7rem; }
html.bdl .ai-modal-content .modal-body{ flex:1 1 auto; overflow-y:auto; padding:16px !important; scrollbar-width:thin; }
/* Accueil */
html.bdl .ai-modal-content .modal-body > .text-center{ margin:auto 0 0 !important; text-align:left !important; padding-top:8px; }
html.bdl .ai-modal-content .modal-body > .text-center .icon{ display:none !important; }
html.bdl .ai-modal-content .modal-body > .text-center h4{ font-size:0 !important; margin:0; }
html.bdl .ai-modal-content .modal-body > .text-center h4::before{ content:"Bonjour, que puis-je faire pour vous ?"; display:block; font-size:1.35rem; font-weight:400; color:var(--bdl-noir); line-height:1.25; }
html.bdl .ai-modal-content .modal-body > .text-center h4::after{ content:"Réservez une salle, invitez un visiteur ou posez une question sur le lieu."; display:block; font-size:.85rem; font-weight:400; color:var(--bdl-gris); margin-top:6px; line-height:1.45; }
html.bdl .ai-modal-content .modal-body:has(> .text-center){ display:flex; flex-direction:column; position:relative; overflow:hidden; }
html.bdl .ai-modal-content .modal-body:has(> .text-center)::before{ content:""; position:absolute; left:0; right:0; top:0; height:78%;
  background:url(https://bdl.workplay.fr/img/verriere-nuit.jpg) center 35%/cover no-repeat;
  -webkit-mask-image:linear-gradient(180deg,#000 45%,transparent); mask-image:linear-gradient(180deg,#000 45%,transparent);
  animation:bdlConcierge 18s ease-in-out infinite alternate, bdlFondu .9s ease-out both; transform-origin:60% 40%; }
html.bdl .ai-modal-content .modal-body:has(> .text-center)::after{ content:"34, bd Haussmann · à votre service"; position:absolute; left:20px; top:18px; font-size:.68rem; letter-spacing:.22em; text-transform:uppercase; color:rgba(255,255,255,.9); text-shadow:0 1px 8px rgba(0,0,0,.4); }
html.bdl .ai-modal-content .modal-body > .text-center{ position:relative; z-index:1; }
@keyframes bdlConcierge{ from{ transform:scale(1.02); } to{ transform:scale(1.12) translateY(-2%); } }
@keyframes bdlFondu{ from{ opacity:0; } to{ opacity:1; } }
/* Messages */
html.bdl .ai-modal-content section.ai-response{ border:0 !important; padding:10px 14px !important; margin:0 0 8px !important; border-radius:16px 16px 16px 4px !important; background:#fff !important; max-width:88%; font-size:.88rem; line-height:1.5; color:var(--bdl-noir); box-shadow:0 1px 0 rgba(25,17,11,.05); }
html.bdl .ai-modal-content section.ai-response > svg{ display:none !important; }
html.bdl .ai-modal-content section.ai-response:has(> svg[viewBox="0 0 448 512"]){ margin-left:auto !important; background:var(--bdl-noir) !important; color:#fff !important; border-radius:16px 16px 4px 16px !important; }
html.bdl .ai-modal-content section.ai-response:has(> svg[viewBox="0 0 448 512"]) *{ color:#fff !important; }
html.bdl .ai-modal-content section.ai-response p{ margin:0 0 .5em; }
html.bdl .ai-modal-content section.ai-response p:last-child{ margin-bottom:0; }
html.bdl .ai-modal-content section.ai-response a{ color:var(--bdl-noir) !important; text-decoration:underline; text-underline-offset:3px; }
html.bdl .ai-modal-content section.ai-response img{ width:56px !important; height:56px !important; object-fit:cover; border-radius:8px !important; }
html.bdl .ai-modal-content section.ai-response .btn, html.bdl .ai-modal-content section.ai-response button{ font-size:.72rem !important; padding:.3rem .75rem !important; border-radius:999px !important; border:1px solid var(--bdl-noir) !important; background:transparent !important; color:var(--bdl-noir) !important; text-decoration:none !important; letter-spacing:.02em !important; text-transform:none !important; white-space:nowrap !important; width:auto !important; min-width:0 !important; }
html.bdl .ai-modal-content section.ai-response .btn:hover, html.bdl .ai-modal-content section.ai-response button:hover{ background:var(--bdl-noir) !important; color:#fff !important; }
html.bdl .ai-modal-content section.ai-response .card{ background:#F6F1EB !important; border:0 !important; border-radius:12px !important; padding:10px !important; margin-top:8px; }
html.bdl .ai-modal-content section.ai-response .card h5{ font-size:.88rem !important; font-weight:500 !important; margin-bottom:2px !important; }
html.bdl .ai-modal-content section.ai-response .card .d-flex.gap-2, html.bdl .ai-modal-content section.ai-response .card .d-flex.flex-wrap{ gap:6px !important; flex-wrap:wrap; }
html.bdl .ai-modal-content section.ai-response .card *{ font-size:.8rem; line-height:1.4; }
/* Pied : saisie et suggestions */
html.bdl .ai-modal-content .ai-modal-footer{ flex:0 0 auto; padding:10px 14px 14px !important; background:#F6F1EB; border-top:1px solid rgba(25,17,11,.08) !important; display:block; }
html.bdl .ai-modal-content .ai-modal-footer form{ display:flex; flex-direction:column-reverse; gap:10px; }
html.bdl .ai-modal-content .ai-modal-footer .input-group{ background:#fff; border-radius:999px; padding:4px; box-shadow:0 0 0 1px rgba(25,17,11,.12); flex-wrap:nowrap; }
html.bdl .ai-modal-content .ai-modal-footer .input-group:focus-within{ box-shadow:0 0 0 1px var(--bdl-noir); }
html.bdl .ai-modal-content .ai-modal-footer .form-control{ border:0 !important; box-shadow:none !important; background:transparent !important; padding:.55rem .9rem !important; font-size:.88rem; border-radius:999px !important; }
html.bdl .ai-modal-content .ai-modal-footer .form-control::placeholder{ color:transparent; }
html.bdl .ai-modal-content .ai-modal-footer .input-group:has(.form-control:placeholder-shown)::after{ content:"Écrivez votre demande…"; position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--bdl-gris); font-size:.88rem; pointer-events:none; }
html.bdl .ai-modal-content .ai-modal-footer .input-group{ position:relative; }
html.bdl .ai-modal-content .ai-modal-footer .input-group .btn{ width:38px; height:38px; flex:0 0 38px; border-radius:50% !important; padding:0 !important; display:grid; place-items:center; background:var(--bdl-noir) !important; border:0 !important; }
html.bdl .ai-modal-content .ai-modal-footer hr, html.bdl .ai-modal-content .ai-modal-footer > form > small, html.bdl .ai-modal-content .ai-modal-footer h5{ display:none !important; }
html.bdl .ai-modal-content .ai-modal-footer .text-start{ display:flex; flex-wrap:wrap; gap:6px; }
html.bdl .ai-modal-content .ai-modal-footer .text-start > div:nth-child(2), html.bdl .ai-modal-content .ai-modal-footer .text-start > div:nth-child(n+6){ display:none !important; }
html.bdl .ai-modal-content .ai-modal-footer .text-start > div > .d-flex{ display:none !important; }
html.bdl .ai-modal-content .ai-modal-footer .text-start .bg-light{ margin:0 !important; padding:0 !important; background:transparent !important; }
html.bdl .ai-modal-content .ai-modal-footer .text-start button.card{ background:#fff !important; border:1px solid rgba(25,17,11,.14) !important; border-radius:999px !important; padding:.4rem .8rem !important; font-size:.78rem; color:var(--bdl-noir); line-height:1.3; transition:border-color .2s, background .2s; }
html.bdl .ai-modal-content .ai-modal-footer .text-start button.card:hover{ border-color:var(--bdl-noir) !important; }
@media (max-width:575px){ html.bdl .ai-modal-dialog{ right:8px; bottom:8px; width:calc(100vw - 16px); } html.bdl .ai-modal-content{ height:calc(100vh - 16px); } }
/* Assistant : barre dans le bandeau */
.bdl-assist{ margin-top:1.75rem; max-width:760px; opacity:0; animation:bdlMonte .8s var(--bdl-ease) .95s forwards; }
.bdl-assist-barre{ display:flex; align-items:center; gap:14px; width:100%; text-align:left; cursor:pointer;
  background:rgba(25,17,11,.42); border:1px solid rgba(255,255,255,.28); border-radius:999px; padding:10px 10px 10px 22px; color:#fff;
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); transition:background .25s, border-color .25s; font:inherit; }
.bdl-assist-barre:hover{ background:rgba(25,17,11,.58); border-color:rgba(255,255,255,.5); }
.bdl-assist-barre .ico{ flex:0 0 auto; width:20px; height:20px; }
.bdl-assist-barre .txt{ flex:1 1 auto; font-size:1rem; color:rgba(255,255,255,.82); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bdl-assist-barre .txt b{ color:#fff; font-weight:500; }
.bdl-assist-barre .go{ flex:0 0 auto; background:#fff; color:var(--bdl-noir); border-radius:999px; padding:.6rem 1.15rem; font-size:.78rem; letter-spacing:.14em; text-transform:uppercase; font-weight:500; }
.bdl-assist-puces{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.bdl-assist-puces button{ font:inherit; font-size:.82rem; color:#fff; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.3); border-radius:999px; padding:.4rem .9rem; cursor:pointer; transition:background .2s, border-color .2s; }
.bdl-assist-puces button:hover{ background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.6); }
@media (max-width:767px){ .bdl-assist-barre .go{ display:none; } .bdl-assist-barre{ padding:14px 18px; } }
/* À la une : vignette pleine largeur */
.bdl-pleine .g-4.row > .col-lg-6 > .vstack .flex-shrink-0{ max-width:none !important; width:100% !important; }
/* Pied de page */
html.bdl footer.bg-primary{ padding:28px max(var(--bdl-pad), calc((100% - var(--bdl-max)) / 2 + var(--bdl-pad))) !important; border-radius:20px 20px 0 0 !important; }
html.bdl footer.bg-primary > div{ align-items:center !important; gap:24px !important; }
html.bdl .bdl-pied-info{ display:flex; align-items:center; gap:32px; flex-wrap:wrap; flex:1 1 auto; justify-content:center; font-size:.82rem; color:rgba(255,255,255,.78); }
html.bdl .bdl-pied-info a{ color:rgba(255,255,255,.78) !important; text-decoration:none; }
html.bdl .bdl-pied-info a:hover{ color:#fff !important; }
html.bdl .bdl-pied-c{ display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; color:rgba(255,255,255,.8); font-size:.82rem; }
html.bdl .bdl-pied-liens{ display:flex; gap:24px; flex-wrap:wrap; }
html.bdl .bdl-pied-liens a{ color:rgba(255,255,255,.8) !important; text-decoration:none; letter-spacing:.04em; }
html.bdl .bdl-pied-liens a:hover{ color:#fff !important; }
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
      '<p class="bdl-sous">Vos réservations, vos invités et la vie du lieu, réunis sur une seule page.</p>' +
      '<div class="bdl-assist">' +
        '<button type="button" class="bdl-assist-barre" data-q="">' +
          '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/></svg>' +
          '<span class="txt"><b>Votre concierge</b> · réservez, invitez, posez une question…</span>' +
          '<span class="go">Demander</span>' +
        '</button>' +
        '<div class="bdl-assist-puces">' +
          '<button type="button" data-q="Réserve-moi une salle pour 6 personnes demain à 10h">Une salle demain à 10h</button>' +
          '<button type="button" data-q="Je veux inviter un visiteur">Inviter un visiteur</button>' +
          '<button type="button" data-q="Quelles formules d\'abonnement proposez-vous à partir du mois prochain ?">Nos formules</button>' +
          '<button type="button" data-q="Que pouvez-vous faire pour moi ?">Tout ce qu\'il sait faire</button>' +
        '</div>' +
      '</div>';
    s.querySelectorAll("[data-q]").forEach(function (b) {
      b.addEventListener("click", function () { ouvrirAssistant(b.getAttribute("data-q")); });
    });
    hero.insertBefore(grain, hero.firstChild);
    hero.insertBefore(voile, hero.firstChild);
    hero.insertBefore(bg, hero.firstChild);
    var contenu = hero.querySelector(".z-index-1");
    hero.insertBefore(s, contenu || null);
  }

  /* Ouvre l'assistant Nexudus et, si besoin, lui envoie la question */
  function champAssistant() {
    return Array.prototype.filter.call(doc.querySelectorAll("textarea, input[type=text], input:not([type])"), function (e) {
      return e.offsetParent && !e.closest(".bdl-salut") && /message|demande|faire pour/i.test(e.placeholder || "");
    })[0];
  }
  function ouvrirAssistant(q) {
    var m = doc.querySelector(".ai-chat-manager");
    if (!m) return;
    if (!champAssistant()) (m.querySelector("button") || m).click();
    if (!q) return;
    var n = 0;
    (function essai() {
      var ta = champAssistant();
      if (!ta) { if (++n < 40) setTimeout(essai, 100); return; }
      var proto = ta.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(ta, q);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.focus();
      setTimeout(function () {
        var p = ta.parentElement, b = null;
        for (var i = 0; i < 3 && p && !b; i++) { b = p.querySelector("button[type=submit], button:not([disabled])"); p = p.parentElement; }
        if (b) b.click();
        else ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      }, 150);
    })();
  }

  var obs = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vu"); obs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  function reveler(el, i) {
    return;
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
    doc.querySelectorAll(".bdl-pleine h3.card-header-title, .bdl-pleine h3").forEach(function (h) {
      if (h.textContent.trim() === "Avantages.") h.textContent = "Avantages partenaires";
    });
    calendrier();
    /* Assistant : retire la distance calculée depuis le navigateur, peu fiable */
    var fen = doc.querySelector(".ai-modal-content");
    if (fen) {
      fen.querySelectorAll("span, small").forEach(function (sp) {
        if (!sp.dataset.bdlKm && /^\s*\(.*km de distance\)\s*$/.test(sp.textContent)) { sp.dataset.bdlKm = "1"; sp.style.display = "none"; }
      });
      /* Lieu de démonstration hérité du compte : masqué */
      fen.querySelectorAll(".card h5").forEach(function (h) {
        if (/Coliving Demo/i.test(h.textContent)) { var cd = h.closest(".card"); if (cd) (cd.parentElement || cd).style.display = "none"; }
      });
    }
    var pied =doc.querySelector("footer.bg-primary > div");
    if (pied && !pied.querySelector(".bdl-pied-info")) {
      var base = (location.pathname.match(/^\/[^/]+/) || [""])[0];
      var info = doc.createElement("div");
      info.className = "bdl-pied-info";
      info.innerHTML = '<span>34, boulevard Haussmann · 75009 Paris</span>' +
        '<a href="' + base + '/bookings/meeting-rooms/list">Salles de réunion</a>' +
        '<a href="' + base + '/events/agenda">Agenda des événements</a>' +
        '<a href="' + base + '/user/activity/events">Mes événements</a>';
      if (pied.children[1]) pied.insertBefore(info, pied.children[1]); else pied.appendChild(info);
    }
    doc.querySelectorAll(".bdl-pleine button span, .bdl-pleine .btn span").forEach(function (sp) {
      if (sp.textContent.trim() === "Réclamation") sp.textContent = "En profiter";
    });
    doc.querySelectorAll(".quick-actions-banner-container .icon-external-link").forEach(function (ic) {
      if (ic.querySelector("svg[data-bdl]")) return;
      ic.innerHTML = '<svg data-bdl="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18M3 9v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M8 3v4M16 3v4"/><path d="M9.5 14.5l1.7 1.7 3.3-3.4"/></svg>';
    });
    /* Logos de partenaires : affichés entiers, sans recadrage */
    doc.querySelectorAll(".bdl-pleine .card").forEach(function (cd) {
      var t = (cd.innerText || "").trim();
      if (!/^Uber\b/.test(t)) return;
      var img = cd.querySelector("img");
      if (!img || img.dataset.bdlLogo) return;
      img.dataset.bdlLogo = "1";
      img.classList.add("bdl-logo");
      img.src = BASE + "/img/facade.jpg";
    });
  }

  function calendrier() {
    var c = doc.querySelector(".fc-upcoming-agenda-calendar");
    if (!c) return;
    var sc = c.querySelector(".fc-scroller") ;
    var jours = c.querySelectorAll(".fc-scrollgrid-sync-table td.fc-daygrid-day").length;
    if (!sc || !jours) return;
    var visibles = sc.clientWidth >= 760 ? 5 : sc.clientWidth >= 480 ? 3 : 2;
    var w = (sc.getBoundingClientRect().width * jours / visibles).toFixed(2);
    if (c.style.getPropertyValue("--bdl-calw") !== w + "px") c.style.setProperty("--bdl-calw", w + "px");
    if (!c.dataset.bdlRo && window.ResizeObserver) { c.dataset.bdlRo = "1"; new ResizeObserver(function () { calendrier(); }).observe(sc); }
  }
  window.addEventListener("resize", function () { setTimeout(calendrier, 120); });
  var attente = 0;
  new MutationObserver(function () {
    if (attente) return;
    attente = setTimeout(function () { attente = 0; appliquer(); }, 50);
  }).observe(doc.body, { childList: true, subtree: true });
  appliquer();
})();

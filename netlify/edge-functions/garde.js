// Protège tout le site par mot de passe : SITE_PASSWORD, un second mot de passe facultatif SITE_PASSWORD_2,
// et un mot de passe invité SITE_PASSWORD_INVITE qui exige l'e-mail du visiteur.
// Chaque mot de passe a son propre jeton : retirer un secret déconnecte ceux qui sont entrés avec.
// Entrée d'un invité : son e-mail devient un contact Nexudus, et une alerte part par e-mail
// via Resend (variables RESEND_API_KEY, ALERTE_EMAIL, ALERTE_DE), sinon via le Worker bdl-notif.
// Sans cookie valide, chaque page affiche l'écran de connexion ; les appels /api/* répondent 401.
// Les images de /img/ restent servies pour que l'écran de connexion puisse les afficher.
// /portail/ contient l'habillage chargé par le portail membre Nexudus : il doit rester public.

const COOKIE = "bdl_acces";
const DUREE = 60 * 60 * 24 * 30; // 30 jours

import { contact } from "../lib/nexudus.mjs";

const env = k => (globalThis.Netlify && Netlify.env.get(k)) || (globalThis.process && process.env[k]) || "";

async function jeton(secret) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode("bdl-acces-v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function egal(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const lireCookie = (req, nom) => (req.headers.get("cookie") || "").split(/;\s*/).map(c => c.split("=")).find(([k]) => k === nom)?.[1] || "";
const sur = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const versInterne = s => (typeof s === "string" && s.startsWith("/") && !s.startsWith("//") ? s : "/");

const emailValide = e => /^[^\s@<>"]{1,64}@[^\s@<>"]+\.[a-z]{2,}$/i.test(e) && e.length <= 160;

// Alerte d'entrée d'un invité : contact Nexudus + e-mail via le Worker bdl-notif. Ne bloque jamais l'entrée.
async function signaler(context, req, email, suite) {
  const quand = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });
  let nouveau = null;
  try {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
    const nom = local ? local.replace(/\b\p{L}/gu, c => c.toUpperCase()) : email;
    const c = await contact({ nom, email, note: `Visiteur du site démo bdl.workplay.fr (accès invité). Entrée le ${quand}.` });
    nouveau = c.nouveau;
  } catch (e) { console.error("Contact visiteur non créé :", e.status || e.message); }
  const cf = req.cf || {};
  const lieu = [cf.city, cf.country].filter(Boolean).join(", ") || "inconnu";
  const nav = (req.headers.get("user-agent") || "").slice(0, 200);
  const lignes = [`${email} vient d'entrer sur bdl.workplay.fr avec le mot de passe invité.`, "", `Quand : ${quand}`, `Page demandée : ${suite}`, `Lieu approximatif : ${lieu}`, `Navigateur : ${nav}`, "",
    nouveau === true ? "Un nouveau contact a été créé dans Nexudus." : nouveau === false ? "Ce contact existait déjà dans Nexudus." : ""];
  // Alerte par Resend (domaine d'envoi déjà vérifié chez Resend). Variables Cloudflare : RESEND_API_KEY (secret),
  // ALERTE_EMAIL (destinataire) et ALERTE_DE (expéditeur, sur le domaine vérifié).
  const lire = k => (context.env && context.env[k]) || env(k);
  const cle = lire("RESEND_API_KEY"), dest = lire("ALERTE_EMAIL"), de = lire("ALERTE_DE");
  if (cle && dest && de) {
    try {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${cle}`, "content-type": "application/json" },
        body: JSON.stringify({ from: `Bureau des Légendes <${de}>`, to: dest.split(",").map(x => x.trim()).filter(Boolean), reply_to: email,
          subject: `Visite du site BDL : ${email}`, text: lignes.join("\n"),
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#19110B"><p><b>${sur(email)}</b> vient d'entrer sur <a href="https://bdl.workplay.fr">bdl.workplay.fr</a> avec le mot de passe invité.</p><table style="border-collapse:collapse;font-size:14px">${[["Quand", quand], ["Page demandée", suite], ["Lieu approximatif", lieu], ["Navigateur", nav]].map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#6B635C">${k}</td><td style="padding:3px 0">${sur(v)}</td></tr>`).join("")}</table><p style="color:#6B635C">${sur(lignes[7])}</p></div>` }) });
      if (!r.ok) console.error("Alerte Resend refusée :", r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.error("Alerte Resend non envoyée :", e.message); }
    return;
  }
  // Sinon, relais par le Worker bdl-notif (service binding NOTIF)
  const notif = context.env && context.env.NOTIF;
  if (notif) {
    try {
      await notif.fetch("https://bdl-notif/", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, quand, page: suite, ville: cf.city || "", pays: cf.country || "", navigateur: nav, nouveau }) });
    } catch (e) { console.error("Alerte e-mail non envoyée :", e.message); }
  }
}

export default async (req, context) => {
  const url = new URL(req.url);
  const p = url.pathname;
  if (p.startsWith("/img/email/")) {
    // Modèles d'e-mails : lisibles depuis l'éditeur de Flow, y compris à travers la redirection .html → sans extension
    const r = await context.next();
    const h = new Headers(r.headers); h.set("access-control-allow-origin", "*");
    return new Response(r.body, { status: r.status, headers: h });
  }
  if (p.startsWith("/img/") || p.startsWith("/portail/")) return context.next();

  const secrets = ["SITE_PASSWORD", "SITE_PASSWORD_2"].map(env).filter(Boolean);
  const invite = env("SITE_PASSWORD_INVITE");
  const secret = secrets.length > 0 || !!invite;
  const jetons = await Promise.all(secrets.map(jeton));
  const jetonInvite = invite ? await jeton(invite) : null;
  if (jetonInvite) jetons.push(jetonInvite);

  if (p === "/deconnexion") {
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (p === "/connexion" && req.method === "POST") {
    const f = await req.formData().catch(() => null);
    const mdp = f ? String(f.get("mot_de_passe") || "") : "";
    const email = f ? String(f.get("email") || "").trim().toLowerCase() : "";
    const suite = versInterne(f && f.get("suite"));
    if (!secret) return page(suite, "L'accès n'est pas encore configuré. Revenez un peu plus tard.", 503, email);
    const saisi = await jeton(mdp);
    const attendu = jetons.find(j => egal(saisi, j));
    if (attendu && jetonInvite && egal(attendu, jetonInvite)) {
      // Mot de passe invité : l'e-mail est obligatoire
      if (!emailValide(email)) return page(suite, "Indiquez votre adresse e-mail pour entrer.", 400, email);
      const tache = signaler(context, req, email, suite);
      if (context.waitUntil) context.waitUntil(tache); else await tache;
    }
    if (attendu) {
      return new Response(null, { status: 303, headers: { location: suite, "set-cookie": `${COOKIE}=${attendu}; Path=/; Max-Age=${DUREE}; HttpOnly; Secure; SameSite=Lax`, "x-robots-tag": "noindex, nofollow" } });
    }
    await new Promise(r => setTimeout(r, 700));
    return page(suite, "Ce mot de passe n'est pas le bon.", 401, email);
  }

  const recu = lireCookie(req, COOKIE);
  if (recu && jetons.some(j => egal(recu, j))) {
    const r = await context.next();
    const h = new Headers(r.headers); h.set("x-robots-tag", "noindex, nofollow");
    return new Response(r.body, { status: r.status, headers: h });
  }

  if (p.startsWith("/api/")) {
    return new Response(JSON.stringify({ ok: false, erreur: "Session expirée. Rechargez la page pour vous reconnecter." }), { status: 401, headers: { "content-type": "application/json; charset=utf-8" } });
  }
  return page(p === "/connexion" ? "/" : p + url.search, "", 401);
};

// Textes de l'écran d'accès : en anglais quand la page demandée est celle de la version anglaise.
const TEXTES = {
  fr: { lang: "fr", acces: "Accès sur invitation", titre: "Bienvenue au Bureau des Légendes.", sous: "Une adresse imaginaire au 312, boulevard Haussmann, et une démonstration grandeur nature de Nexudus.",
    commencer: "Entrer", entree: "appuyez sur <b>Entrée ↵</b>", q1: "Votre e-mail professionnel ?", a1: "Pour que l'équipe puisse vous recontacter au sujet de cette démonstration.",
    ph1: "nom@entreprise.fr", ok: "OK", passer: "Accès équipe : passer cette étape", q2: "Le mot de passe qui vous a été communiqué.", a2: "Il figure dans votre invitation.",
    ph2: "Mot de passe", afficher: "Afficher", masquer: "Masquer", entrer: "Entrer", retour: "Retour", mailKo: "Cette adresse ne semble pas valide.",
    rgpd: "Votre e-mail est transmis à l'équipe Nexudus, qui pourra vous recontacter au sujet de cette démonstration. Il ne sert à rien d'autre.",
    fictif: "Le Bureau des Légendes est un lieu fictif, créé pour montrer Nexudus en situation.", nx: "Découvrir Nexudus", etape: "Étape" },
  en: { lang: "en", acces: "By invitation", titre: "Welcome to Bureau des Légendes.", sous: "An imaginary address at 312, boulevard Haussmann, and a full-scale Nexudus demo.",
    commencer: "Come in", entree: "press <b>Enter ↵</b>", q1: "Your work email?", a1: "So the team can get back to you about this demo.",
    ph1: "name@company.com", ok: "OK", passer: "Team access: skip this step", q2: "The password you were given.", a2: "You will find it in your invitation.",
    ph2: "Password", afficher: "Show", masquer: "Hide", entrer: "Enter", retour: "Back", mailKo: "This address does not look valid.",
    rgpd: "Your email is shared with the Nexudus team, who may contact you about this demo. It is not used for anything else.",
    fictif: "Bureau des Légendes is a fictional place, created to show Nexudus at work.", nx: "Discover Nexudus", etape: "Step" },
};
const ERREURS_EN = { "Ce mot de passe n'est pas le bon.": "This password is incorrect.", "Indiquez votre adresse e-mail pour entrer.": "Please enter your email address to come in.", "L'accès n'est pas encore configuré. Revenez un peu plus tard.": "Access is not set up yet. Please come back a little later." };
function page(suite, erreur, status, email = "") {
  const en = /^\/(en|plateau\/en)(\/|$|\?)/.test(suite), T = TEXTES[en ? "en" : "fr"];
  const erreurMail = /e-mail/.test(erreur);
  if (en && erreur) erreur = ERREURS_EN[erreur] || erreur;
  // Étape d'ouverture : l'accueil, ou directement la question en défaut après une erreur
  const depart = !erreur ? 0 : erreurMail ? 1 : 2;
  const mots = T.titre.split(" ").map((m, i) => `<span class="w"><span style="--i:${i}">${sur(m)}</span></span>`).join(" ");
  const html = `<!doctype html>
<html lang="${T.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#140D08">
<title>Bureau des Légendes · ${en ? "Access" : "Accès"}</title>
<link rel="icon" type="image/png" href="/img/mark-noir.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap">
<style>
:root{--noir:#140D08;--creme:#F6F1EB;--gris:#C9C0B6;--bleu:#7FA6D6;--f:"Jost","Futura","Century Gothic","Avenir Next",system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);--g:max(22px,clamp(22px,5vw,72px),env(safe-area-inset-left,0px))}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--noir);color:#fff;font:400 16px/1.6 var(--f);-webkit-font-smoothing:antialiased;overflow:hidden}
.fond{position:fixed;inset:-4%;z-index:0;transform:translate3d(var(--px,0px),var(--py,0px),0);transition:transform 1.4s var(--ease)}
.fond i{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;animation:defile 27s linear infinite}
.fond i:nth-child(1){background-image:url(/img/entree.webp);animation-delay:-1s}
.fond i:nth-child(2){background-image:url(/img/verriere-nuit.jpg);animation-delay:8s}
.fond i:nth-child(3){background-image:url(/img/hero.jpg);animation-delay:17s}
@keyframes defile{0%{opacity:0;transform:scale(1.04)}6%{opacity:1}33%{opacity:1}40%{opacity:0;transform:scale(1.18) translate(-1.5%,-1%)}100%{opacity:0}}
.voile{position:fixed;inset:0;z-index:1;background:linear-gradient(90deg,rgba(20,13,8,.9) 0%,rgba(20,13,8,.62) 50%,rgba(20,13,8,.35) 100%),linear-gradient(180deg,rgba(20,13,8,.45),rgba(20,13,8,0) 30%,rgba(20,13,8,0) 65%,rgba(20,13,8,.8));transition:background .8s}
body.q .voile{background:rgba(20,13,8,.78)}
.haut{position:fixed;z-index:3;left:var(--g);right:var(--g);top:max(26px,env(safe-area-inset-top,0px));display:flex;justify-content:space-between;align-items:flex-start;gap:20px;animation:apparait 1.2s .2s var(--ease) both}
.haut img{height:42px;width:auto;display:block}
.marque{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.badge,.acces{font:400 10.5px/1 var(--f);letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.82);padding:8px 10px;border:1px solid rgba(255,255,255,.35)}
.badge b{font-weight:500;color:#fff}
.flip{display:inline-block;perspective:600px}
.flip .ff{display:grid;transform-style:preserve-3d;transition:transform .9s var(--ease)}
.flip .fa,.flip .fb{grid-area:1/1;backface-visibility:hidden;-webkit-backface-visibility:hidden;white-space:nowrap}
.flip .fb{transform:rotateX(180deg)}
.flip.tourne .ff{transform:rotateX(180deg)}
.acces{border:0;padding:8px 0;display:flex;align-items:center;gap:10px}
.acces::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--bleu);box-shadow:0 0 0 5px rgba(127,166,214,.22);animation:pouls 2.4s ease-in-out infinite}
main{position:fixed;inset:0;z-index:2}
.pas{position:absolute;left:var(--g);right:var(--g);top:50%;max-width:1000px;transform:translateY(calc(-50% + 50px));opacity:0;visibility:hidden;transition:opacity .6s var(--ease),transform .8s var(--ease),visibility 0s .8s}
.pas.on{opacity:1;visibility:visible;transform:translateY(-50%);transition:opacity .7s .15s var(--ease),transform .9s .1s var(--ease),visibility 0s}
.pas.passe{transform:translateY(calc(-50% - 60px))}
h1{margin:0;font:200 clamp(44px,7.4vw,118px)/1 var(--f);letter-spacing:.04em;text-transform:uppercase;max-width:9em}
.w{display:inline-block;overflow:hidden;vertical-align:top;padding:.12em 0 .06em;margin:-.12em 0 -.06em}
.w>span{display:inline-block;transform:translateY(105%)}
.pas.on .w>span{animation:monte 1.1s var(--ease) both;animation-delay:calc(.35s + var(--i) * 80ms)}
.sous{margin:28px 0 0;max-width:34em;font-size:clamp(16px,1.4vw,19px);color:var(--gris);animation:apparait 1s 1s var(--ease) both}
.num{display:flex;align-items:center;gap:12px;font:400 13px/1 var(--f);letter-spacing:.18em;color:var(--bleu);margin-bottom:18px}
.num::after{content:"→";letter-spacing:0}
label.qq{display:block;font:300 clamp(28px,3.8vw,54px)/1.15 var(--f);letter-spacing:.02em}
.aide{margin:12px 0 0;color:var(--gris);font-size:clamp(15px,1.2vw,17px)}
.champ{display:flex;align-items:center;gap:16px;margin-top:clamp(26px,4vh,40px);border-bottom:1px solid rgba(255,255,255,.4);transition:border-color .3s,box-shadow .3s;max-width:760px}
.champ:focus-within{border-color:#fff;box-shadow:0 1px 0 #fff}
input{flex:1;min-width:0;border:0;background:transparent;padding:10px 0 14px;font:300 clamp(24px,3vw,40px)/1.3 var(--f);color:#fff;outline:none;caret-color:var(--bleu)}
input::placeholder{color:rgba(255,255,255,.3)}
.oeil{background:none;border:0;padding:0;cursor:pointer;font:400 11px/1 var(--f);letter-spacing:.2em;text-transform:uppercase;color:var(--gris)}
.oeil:hover{color:#fff}
.actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;margin-top:28px}
.btn{display:inline-flex;align-items:center;gap:14px;border:0;background:#fff;color:var(--noir);padding:16px 26px;font:400 12.5px/1.2 var(--f);letter-spacing:.22em;text-transform:uppercase;cursor:pointer;position:relative;overflow:hidden;isolation:isolate;transition:color .35s var(--ease)}
.btn::before{content:"";position:absolute;inset:0;z-index:-1;background:#3C6A9E;transform:scaleX(0);transform-origin:right;transition:transform .5s var(--ease)}
.btn:hover,.btn:focus-visible{color:#fff}.btn:hover::before,.btn:focus-visible::before{transform:scaleX(1);transform-origin:left}
.btn i{font-style:normal;font-size:17px;transition:transform .4s var(--ease)}.btn:hover i{transform:translateX(5px)}
.astuce{font-size:13px;color:var(--gris)}.astuce b{font-weight:500;color:#fff}
.lien{background:none;border:0;padding:0;color:var(--gris);font:400 13px/1.4 var(--f);cursor:pointer;text-decoration:underline;text-underline-offset:4px}
.lien:hover{color:#fff}
.err{min-height:1.4em;margin:14px 0 0;color:#F2A49B;font-size:15px}
.err:not(:empty){animation:secoue .45s}
.rgpd{margin:26px 0 0;max-width:42em;font-size:12.5px;line-height:1.55;color:rgba(255,255,255,.55)}
.bas{position:fixed;z-index:3;left:var(--g);right:var(--g);bottom:max(22px,env(safe-area-inset-bottom,0px));display:flex;justify-content:space-between;align-items:flex-end;gap:20px;font-size:12.5px;color:rgba(255,255,255,.6);animation:apparait 1s 1.4s var(--ease) both}
.bas a{color:#fff;text-underline-offset:4px}
.etapes{display:flex;align-items:center;gap:12px;font:400 11px/1 var(--f);letter-spacing:.2em;text-transform:uppercase;white-space:nowrap}
.barre{width:120px;height:2px;background:rgba(255,255,255,.2);position:relative;overflow:hidden}
.barre::after{content:"";position:absolute;inset:0;background:#fff;transform:scaleX(var(--p,0));transform-origin:left;transition:transform .8s var(--ease)}
.retour{background:none;border:1px solid rgba(255,255,255,.35);color:#fff;width:34px;height:34px;cursor:pointer;font-size:15px;line-height:1}
.retour:hover{background:#fff;color:var(--noir)}
.retour[hidden]{display:none}
:focus-visible{outline:1px solid #fff;outline-offset:4px}
input:focus-visible{outline:none}
@keyframes monte{to{transform:none}}
@keyframes apparait{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes secoue{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
@keyframes pouls{50%{box-shadow:0 0 0 9px rgba(127,166,214,0)}}
/* Sans JavaScript : les deux champs l'un sous l'autre */
html:not(.js) body{overflow:auto}
html:not(.js) main{position:relative;padding:150px var(--g) 140px}
html:not(.js) .pas{position:relative;top:auto;left:auto;right:auto;transform:none;opacity:1;visibility:visible;margin-bottom:60px}
html:not(.js) .pas[data-p="0"],html:not(.js) .etapes,html:not(.js) [data-suite]{display:none}
@media (max-width:700px){.haut img{height:34px}.acces{max-width:9em;text-align:right;line-height:1.4}.bas{flex-direction:column;align-items:flex-start;gap:10px;font-size:11.5px}.astuce{display:none}.pas{top:55%}h1{font-size:clamp(34px,10.5vw,52px)}label.qq{font-size:26px}.aide{font-size:14px;margin-top:8px}input{font-size:22px}.champ{margin-top:18px}.actions{margin-top:18px}.rgpd{font-size:11.5px;margin-top:14px}.sous{margin-top:18px;font-size:15px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.w>span{transform:none}.fond i:nth-child(1){opacity:1}}
</style>
<script>document.documentElement.classList.add("js")</script>
</head>
<body>
<div class="fond" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="voile" aria-hidden="true"></div>
<header class="haut">
  <div class="marque"><img src="/img/logo-blanc.png" alt="Bureau des Légendes" width="496" height="220"><a class="badge flip" id="badge" href="https://nexudus.com" target="_blank" rel="noopener" style="text-decoration:none"><span class="ff"><span class="fa">Powered by <b>Nexudus</b></span><span class="fb" aria-hidden="true">Integrated by <b>Workplay</b></span></span></a></div>
  <span class="acces">${T.acces}</span>
</header>
<main>
  <form id="f" method="post" action="/connexion" novalidate>
    <input type="hidden" name="suite" value="${sur(suite)}">
    <section class="pas" data-p="0">
      <h1>${mots}</h1>
      <p class="sous">${T.sous}</p>
      <div class="actions" style="animation:apparait 1s 1.2s var(--ease) both"><button class="btn" type="button" data-suite>${T.commencer} <i aria-hidden="true">→</i></button><span class="astuce">${T.entree}</span></div>
    </section>
    <section class="pas" data-p="1">
      <span class="num">01</span>
      <label class="qq" for="email">${T.q1}</label>
      <p class="aide">${T.a1}</p>
      <div class="champ"><input id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="${T.ph1}" value="${sur(email)}"></div>
      <p class="err" role="alert" id="err1">${depart === 1 ? sur(erreur) : ""}</p>
      <div class="actions"><button class="btn" type="button" data-suite>${T.ok} <i aria-hidden="true">✓</i></button><span class="astuce">${T.entree}</span><button class="lien" type="button" data-passer>${T.passer}</button></div>
    </section>
    <section class="pas" data-p="2">
      <span class="num">02</span>
      <label class="qq" for="mdp">${T.q2}</label>
      <p class="aide">${T.a2}</p>
      <div class="champ"><input id="mdp" name="mot_de_passe" type="password" autocomplete="current-password" placeholder="${T.ph2}" required><button class="oeil" type="button" id="oeil" aria-controls="mdp" aria-pressed="false">${T.afficher}</button></div>
      <p class="err" role="alert" id="err2">${depart === 2 ? sur(erreur) : ""}</p>
      <div class="actions"><button class="btn" type="submit">${T.entrer} <i aria-hidden="true">→</i></button><span class="astuce">${T.entree}</span></div>
      <p class="rgpd">${T.rgpd}</p>
    </section>
  </form>
</main>
<footer class="bas">
  <p style="margin:0;max-width:44em">${T.fictif} <a href="https://nexudus.com" target="_blank" rel="noopener">${T.nx}</a></p>
  <div class="etapes"><button class="retour" type="button" id="retour" aria-label="${T.retour}" hidden>↑</button><span id="compte">${T.etape} 0 / 2</span><span class="barre" id="barre"></span></div>
</footer>
<script>
(() => {
  const pas = [...document.querySelectorAll(".pas")], f = document.getElementById("f"), mail = document.getElementById("email"), mdp = document.getElementById("mdp");
  const compte = document.getElementById("compte"), barre = document.getElementById("barre"), retour = document.getElementById("retour"), e1 = document.getElementById("err1");
  let k = -1;
  const valide = v => /^[^\\s@<>"]+@[^\\s@<>"]+\\.[a-z]{2,}$/i.test(v);
  function aller(n){
    if (n === k) return;
    pas.forEach((p, i) => { p.classList.toggle("on", i === n); p.classList.toggle("passe", i < n); p.setAttribute("aria-hidden", String(i !== n)); p.inert = i !== n; });
    k = n; document.body.classList.toggle("q", n > 0);
    compte.textContent = "${T.etape} " + n + " / 2"; barre.style.setProperty("--p", n / 2); retour.hidden = n === 0;
    const champ = pas[n].querySelector("input:not([type=hidden])");
    setTimeout(() => (champ || pas[n].querySelector("button")).focus({ preventScroll: true }), 450);
  }
  function suivant(){
    if (k === 0) return aller(1);
    if (k === 1){ const v = mail.value.trim(); if (v && !valide(v)){ e1.textContent = ""; void e1.offsetWidth; e1.textContent = "${T.mailKo}"; return; } e1.textContent = ""; return aller(2); }
    if (k === 2) f.requestSubmit ? f.requestSubmit() : f.submit();
  }
  document.querySelectorAll("[data-suite]").forEach(b => b.addEventListener("click", suivant));
  document.querySelector("[data-passer]").addEventListener("click", () => { mail.value = ""; e1.textContent = ""; aller(2); });
  retour.addEventListener("click", () => aller(Math.max(0, k - 1)));
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.isComposing && !(e.target.closest && e.target.closest("button"))){ e.preventDefault(); suivant(); }
  });
  f.addEventListener("submit", e => { if (!mdp.value){ e.preventDefault(); aller(2); mdp.focus(); } });
  const o = document.getElementById("oeil");
  o.addEventListener("click", () => { const v = mdp.type === "password"; mdp.type = v ? "text" : "password"; o.textContent = v ? "${T.masquer}" : "${T.afficher}"; o.setAttribute("aria-pressed", String(v)); mdp.focus(); });
  // Badge : « Powered by Nexudus » et « Integrated by Workplay » en alternance toutes les 5 secondes
  const bg = document.getElementById("badge");
  if (bg) setInterval(() => { const w = bg.classList.toggle("tourne"); bg.href = w ? "https://workplay.fr" : "https://nexudus.com";
    bg.querySelector(".fa").setAttribute("aria-hidden", String(w)); bg.querySelector(".fb").setAttribute("aria-hidden", String(!w)); }, 5000);
  // Le fond suit légèrement la souris
  if (matchMedia("(hover: hover)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches){
    let raf = 0; const fd = document.querySelector(".fond");
    addEventListener("pointermove", e => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; fd.style.setProperty("--px", (e.clientX / innerWidth - .5) * -24 + "px"); fd.style.setProperty("--py", (e.clientY / innerHeight - .5) * -16 + "px"); }); });
  }
  aller(${depart});
})();
</script>
</body>
</html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

export const config = { path: "/*" };

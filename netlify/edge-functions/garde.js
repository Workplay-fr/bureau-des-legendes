// Protège tout le site par un mot de passe (variable d'environnement Netlify SITE_PASSWORD).
// Sans cookie valide, chaque page affiche l'écran de connexion ; les appels /api/* répondent 401.
// Les images de /img/ restent servies pour que l'écran de connexion puisse les afficher.
// /portail/ contient l'habillage chargé par le portail membre Nexudus : il doit rester public.

const COOKIE = "bdl_acces";
const DUREE = 60 * 60 * 24 * 30; // 30 jours

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

export default async (req, context) => {
  const url = new URL(req.url);
  const p = url.pathname;
  if (p.startsWith("/img/") || p.startsWith("/portail/")) return context.next();

  const secret = env("SITE_PASSWORD");
  const attendu = secret ? await jeton(secret) : null;

  if (p === "/deconnexion") {
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (p === "/connexion" && req.method === "POST") {
    const f = await req.formData().catch(() => null);
    const mdp = f ? String(f.get("mot_de_passe") || "") : "";
    const suite = versInterne(f && f.get("suite"));
    if (!secret) return page(suite, "L'accès n'est pas encore configuré. Revenez un peu plus tard.", 503);
    if (egal(await jeton(mdp), attendu)) {
      return new Response(null, { status: 303, headers: { location: suite, "set-cookie": `${COOKIE}=${attendu}; Path=/; Max-Age=${DUREE}; HttpOnly; Secure; SameSite=Lax`, "x-robots-tag": "noindex, nofollow" } });
    }
    await new Promise(r => setTimeout(r, 700));
    return page(suite, "Ce mot de passe n'est pas le bon.", 401);
  }

  if (attendu && egal(lireCookie(req, COOKIE), attendu)) {
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
  fr: { lang: "fr", photo: "Façade haussmannienne au crépuscule", sous: "Paris IX<sup>e</sup> · Coworking et bureaux", label: "Accès réservé", titre: "Bienvenue au Bureau des Légendes.",
    intro: "Ce site de démonstration est accessible sur invitation. Saisissez le mot de passe qui vous a été communiqué.", mdp: "Mot de passe", afficher: "Afficher", masquer: "Masquer", entrer: "Entrer",
    fictif: "<b>Un lieu imaginaire.</b> Le Bureau des Légendes est un espace de coworking fictif, créé pour une démonstration. L'adresse, les salles, les tarifs et les photos ne correspondent à aucun lieu réel.",
    nx: "Réservations, demandes de visite, contacts et portail membre fonctionnent avec <b>Nexudus</b>, la plateforme de gestion utilisée par plus de 4 000 espaces de coworking et centres d'affaires dans 90 pays. <a href=\"https://nexudus.com\" target=\"_blank\" rel=\"noopener\">Découvrir Nexudus</a>" },
  en: { lang: "en", photo: "Haussmann façade at dusk", sous: "Paris 9<sup>th</sup> · Coworking and offices", label: "Restricted access", titre: "Welcome to Bureau des Légendes.",
    intro: "This demo site is available by invitation. Enter the password you were given.", mdp: "Password", afficher: "Show", masquer: "Hide", entrer: "Enter",
    fictif: "<b>An imaginary place.</b> Bureau des Légendes is a fictional coworking space created for a demo. The address, rooms, prices and photos do not match any real place.",
    nx: "Bookings, visit requests, contacts and the member portal run on <b>Nexudus</b>, the management platform used by more than 4,000 coworking spaces and business centres in 90 countries. <a href=\"https://nexudus.com\" target=\"_blank\" rel=\"noopener\">Discover Nexudus</a>" },
};
const ERREURS_EN = { "Ce mot de passe n'est pas le bon.": "This password is incorrect.", "L'accès n'est pas encore configuré. Revenez un peu plus tard.": "Access is not set up yet. Please come back a little later." };
function page(suite, erreur, status) {
  const en = /^\/(en|plateau\/en)(\/|$|\?)/.test(suite), T = TEXTES[en ? "en" : "fr"];
  if (en && erreur) erreur = ERREURS_EN[erreur] || erreur;
  const html = `<!doctype html>
<html lang="${T.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Bureau des Légendes · ${en ? "Access" : "Accès"}</title>
<link rel="icon" type="image/png" href="/img/mark-noir.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap">
<style>
:root{--noir:#19110B;--blanc:#fff;--creme:#F6F1EB;--gris:#6B635C;--line:rgba(25,17,11,.13);--line-2:rgba(25,17,11,.5);--f:"Jost","Futura","Century Gothic","Avenir Next",system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--blanc);color:var(--noir);font:400 16px/1.65 var(--f);-webkit-font-smoothing:antialiased}
.cadre{min-height:100%;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
.photo{position:relative;overflow:hidden;background:var(--noir)}
.photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:kb 3s var(--ease) both}
.photo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,10,6,.15),rgba(15,10,6,.15) 50%,rgba(15,10,6,.75))}
.photo p{position:absolute;left:clamp(24px,4vw,56px);right:24px;bottom:clamp(24px,4vw,48px);z-index:2;margin:0;color:#fff;font:400 12px/1.6 var(--f);letter-spacing:.22em;text-transform:uppercase}
.photo p b{display:block;font:400 clamp(22px,2.4vw,32px)/1.2 var(--f);letter-spacing:.08em;margin-bottom:10px}
.droite{display:flex;flex-direction:column;justify-content:space-between;gap:40px;padding:clamp(28px,5vw,72px) max(20px,clamp(24px,5vw,72px),env(safe-area-inset-right,0px)) clamp(24px,4vw,48px) max(20px,clamp(24px,5vw,72px),env(safe-area-inset-left,0px))}
.logo{height:44px;width:auto;display:block;align-self:flex-start}
.boite{max-width:420px;width:100%;animation:up .9s .1s var(--ease) both}
.label{font:400 12px/1.4 var(--f);letter-spacing:.22em;text-transform:uppercase;color:var(--gris)}
h1{margin:14px 0 0;font:400 clamp(28px,3.2vw,44px)/1.12 var(--f);letter-spacing:.06em;text-transform:uppercase}
.intro{color:var(--gris);margin:18px 0 32px}
label.t{display:block;font:400 11.5px/1.4 var(--f);letter-spacing:.2em;text-transform:uppercase;color:var(--gris);margin-bottom:6px}
.champ{display:flex;border-bottom:1px solid var(--line-2);transition:border-color .3s}
.champ:focus-within{border-color:var(--noir);box-shadow:0 1px 0 var(--noir)}
input{flex:1;min-width:0;border:0;background:transparent;padding:10px 0 12px;font:400 18px/1.4 var(--f);color:var(--noir);outline:none;letter-spacing:.08em}
.oeil{background:none;border:0;padding:0 2px;cursor:pointer;font:400 11px/1 var(--f);letter-spacing:.18em;text-transform:uppercase;color:var(--gris)}
.oeil:hover{color:var(--noir)}
.err{min-height:1.5em;margin:10px 0 0;font-size:14px;color:#B3261E}
.err:not(:empty){animation:secoue .4s}
.btn{margin-top:22px;width:100%;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--noir);background:var(--noir);color:#fff;padding:17px 30px;font:400 12.5px/1.2 var(--f);letter-spacing:.2em;text-transform:uppercase;cursor:pointer;position:relative;overflow:hidden;isolation:isolate;transition:color .35s var(--ease)}
.btn::before{content:"";position:absolute;inset:0;z-index:-1;background:#fff;transform:scaleX(0);transform-origin:right;transition:transform .5s var(--ease)}
@media (hover:hover){.btn:hover{color:var(--noir)}.btn:hover::before{transform:scaleX(1);transform-origin:left}}
:focus-visible{outline:1px solid var(--noir);outline-offset:3px}
input:focus-visible{outline:none}
.note{border-top:1px solid var(--line);padding-top:22px;display:grid;gap:12px;max-width:520px;font-size:14px;color:var(--gris)}
.note b{color:var(--noir);font-weight:500}
.nx{display:flex;gap:14px;align-items:flex-start;background:var(--creme);padding:16px 18px}
.nx .m{flex:none;width:30px;height:30px;border:1px solid var(--noir);display:grid;place-items:center;font:500 13px/1 var(--f);color:var(--noir)}
.nx a{color:var(--noir);text-underline-offset:4px}
@keyframes kb{from{transform:scale(1.15)}to{transform:none}}
@keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes secoue{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@media (max-width:860px){.cadre{grid-template-columns:minmax(0,1fr)}.photo{min-height:38vh}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<main class="cadre">
  <figure class="photo" style="margin:0"><img src="/img/facade.jpg" alt="${T.photo}"><p><b>312, boulevard Haussmann</b>${T.sous}</p></figure>
  <div class="droite">
    <img class="logo" src="/img/logo-noir.png" alt="Bureau des Légendes" width="496" height="220">
    <form class="boite" method="post" action="/connexion">
      <span class="label">${T.label}</span>
      <h1>${T.titre}</h1>
      <p class="intro">${T.intro}</p>
      <label class="t" for="mdp">${T.mdp}</label>
      <div class="champ"><input id="mdp" name="mot_de_passe" type="password" autocomplete="current-password" required autofocus><button class="oeil" type="button" id="oeil" aria-controls="mdp" aria-pressed="false">${T.afficher}</button></div>
      <input type="hidden" name="suite" value="${sur(suite)}">
      <p class="err" role="alert">${sur(erreur)}</p>
      <button class="btn" type="submit">${T.entrer}</button>
    </form>
    <div class="note">
      <p style="margin:0">${T.fictif}</p>
      <div class="nx"><span class="m" aria-hidden="true">N</span><p style="margin:0">${T.nx}</p></div>
    </div>
  </div>
</main>
<script>
const b=document.getElementById("oeil"),i=document.getElementById("mdp");
b.addEventListener("click",()=>{const v=i.type==="password";i.type=v?"text":"password";b.textContent=v?"${T.masquer}":"${T.afficher}";b.setAttribute("aria-pressed",String(v));i.focus();});
</script>
</body>
</html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

export const config = { path: "/*" };

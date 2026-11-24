// Worker Cloudflare « bdl-notif » : envoie à Matthias un e-mail quand un invité entre sur bdl.workplay.fr.
// Appelé uniquement par le site (service binding NOTIF du projet Pages) ; l'adresse workers.dev doit rester désactivée.
// Binding requis : Send Email, nom MAIL, destination matthias@nexudus.com (adresse vérifiée dans Email Routing).
import { EmailMessage } from "cloudflare:email";

const DE = "site@notif.workplay.fr";
const A = "matthias@nexudus.com";
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const propre = (s, n) => String(s || "").replace(/[\r\n]+/g, " ").slice(0, n);

export default {
  async fetch(req, env) {
    if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
    const d = await req.json().catch(() => ({}));
    const email = propre(d.email, 160);
    if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email)) return new Response("Requête invalide", { status: 400 });
    const lieu = [propre(d.ville, 60), propre(d.pays, 10)].filter(Boolean).join(", ") || "inconnu";
    const texte = [
      `${email} vient d'entrer sur bdl.workplay.fr avec le mot de passe invité.`,
      "",
      `Quand : ${propre(d.quand, 80)}`,
      `Page demandée : ${propre(d.page, 200) || "/"}`,
      `Lieu approximatif : ${lieu}`,
      `Navigateur : ${propre(d.navigateur, 200)}`,
      "",
      d.nouveau === true ? "Un nouveau contact a été créé dans Nexudus." : d.nouveau === false ? "Ce contact existait déjà dans Nexudus." : "",
    ].join("\r\n");
    const brut = [
      `From: =?UTF-8?B?${b64("Bureau des Légendes")}?= <${DE}>`,
      `To: ${A}`,
      `Subject: =?UTF-8?B?${b64(`Visite du site BDL : ${email}`)}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@notif.workplay.fr>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(texte).replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");
    await env.MAIL.send(new EmailMessage(DE, A, brut));
    return new Response("ok");
  },
};

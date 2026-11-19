// Concierge IA du site : POST /api/agent { historique: [{role, content}], lang, memo }
// La clé Anthropic est lue côté serveur uniquement (secret Cloudflare ANTHROPIC_API_KEY via context.env),
// jamais renvoyée au navigateur ni écrite dans un journal.
import { json, vide, nettoie } from "../lib/nexudus.mjs";
import { repondre } from "../lib/agent.mjs";

// Limites d'usage (par adresse IP, en mémoire de l'instance) : la clé a un plafond de dépense mensuel.
const FEN = 10 * 60e3, MAX_MESSAGES = 25, MAX_DEVIS = 3, FEN_DEVIS = 3600e3, MAX_TOURS_SESSION = 30;
const vus = new Map();
function limite(ip, cle, max, fen) {
  const k = cle + ":" + ip, t = Date.now(), l = (vus.get(k) || []).filter(x => t - x < fen);
  if (l.length >= max) { vus.set(k, l); return true; }
  l.push(t); vus.set(k, l); if (vus.size > 5000) vus.clear(); return false;
}

export default async (req, context) => {
  const en = /"lang"\s*:\s*"en"/.test(await req.clone().text().catch(() => ""));
  const msg = (fr, enTxt) => (en ? enTxt : fr);
  if (req.method !== "POST") return json(405, { ok: false, erreur: "Méthode non autorisée." });
  const cle = (context && context.env && context.env.ANTHROPIC_API_KEY) || "";
  if (!cle || vide()) return json(503, { ok: false, code: "non_configure", erreur: msg("L'agent n'est pas disponible sur cette version du site.", "The agent is not available on this version of the site.") });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "?";
  if (limite(ip, "msg", MAX_MESSAGES, FEN)) return json(429, { ok: false, code: "limite", erreur: msg("Vous avez envoyé beaucoup de messages en peu de temps. Réessayez dans quelques minutes, ou réservez une visite.", "You have sent many messages in a short time. Please try again in a few minutes, or book a visit.") });
  let d; try { d = await req.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  const lang = d.lang === "en" ? "en" : "fr";
  const historique = Array.isArray(d.historique) ? d.historique.filter(m => m && typeof m.content === "string") : [];
  if (!historique.length) return json(400, { ok: false, erreur: msg("Message vide.", "Empty message.") });
  if (historique.filter(m => m.role === "user").length > MAX_TOURS_SESSION) return json(429, { ok: false, code: "session", erreur: msg("Cette conversation est déjà longue : ouvrez une nouvelle conversation, ou réservez une visite pour en parler avec l'équipe.", "This conversation is already long: start a new one, or book a visit to talk with the team.") });
  const m0 = d.memo && typeof d.memo === "object" ? d.memo : {};
  const memo = { criteres: m0.criteres && typeof m0.criteres === "object" ? { personnes: Number(m0.criteres.personnes) || 1, date_arrivee: nettoie(m0.criteres.date_arrivee, 10), domiciliation: !!m0.criteres.domiciliation, budget_mensuel_ht: Number(m0.criteres.budget_mensuel_ht) || 0 } : null,
    devis: m0.devis && m0.devis.reference ? { reference: nettoie(m0.devis.reference, 12) } : null };
  // Plafond de devis par IP : vérifié au moment de la création (voir lib/agent.mjs).
  memo.peutCreer = () => !limite(ip, "devis", MAX_DEVIS, FEN_DEVIS);
  try {
    const r = await repondre({ historique: historique.slice(-16), lang, memo, cle });
    const { criteres, devis } = memo;
    return json(200, { ok: true, texte: r.texte, offres: r.offres, devis: r.devis, actions: r.actions, memo: { criteres, devis } });
  } catch (e) {
    console.error("agent", e.ia ? e.message : String(e.message || "").slice(0, 200));
    const occupe = e.status === 429 || e.status === 529 || e.status === 402 || e.status === 400 && /credit|billing/i.test(e.message);
    return json(502, { ok: false, code: e.ia ? "ia" : "erreur", erreur: occupe
      ? msg("L'agent est très sollicité en ce moment. Réessayez dans un instant, ou réservez une visite : l'équipe vous répondra directement.", "The agent is very busy right now. Please try again shortly, or book a visit and the team will reply directly.")
      : msg("L'agent est momentanément indisponible. Réessayez dans un instant, ou réservez une visite.", "The agent is unavailable for a moment. Please try again shortly, or book a visit.") });
  }
};

export const config = { path: "/api/agent" };

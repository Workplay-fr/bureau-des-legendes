// Cloudflare Pages : /api/agent (concierge IA), même logique que la fonction Netlify.
import handler from "../../netlify/functions/agent.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

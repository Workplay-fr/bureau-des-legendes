// Cloudflare Pages : /api/etat, même logique que la fonction Netlify.
import handler from "../../netlify/functions/etat.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

// Cloudflare Pages : /api/postes, même logique que la fonction Netlify.
import handler from "../../netlify/functions/postes.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

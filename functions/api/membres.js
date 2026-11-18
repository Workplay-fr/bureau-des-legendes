// Cloudflare Pages : /api/membres, même logique que la fonction Netlify.
import handler from "../../netlify/functions/membres.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

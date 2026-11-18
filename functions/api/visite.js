// Cloudflare Pages : /api/visite, même logique que la fonction Netlify.
import handler from "../../netlify/functions/visite.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

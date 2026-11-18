// Cloudflare Pages : /api/salles, même logique que la fonction Netlify.
import handler from "../../netlify/functions/salles.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

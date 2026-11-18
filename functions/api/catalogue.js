// Cloudflare Pages : /api/catalogue, même logique que la fonction Netlify.
import handler from "../../netlify/functions/catalogue.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

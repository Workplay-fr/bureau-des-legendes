// Cloudflare Pages : /api/pass, même logique que la fonction Netlify.
import handler from "../../netlify/functions/pass.mjs";
export const onRequest = (ctx) => handler(ctx.request, ctx);

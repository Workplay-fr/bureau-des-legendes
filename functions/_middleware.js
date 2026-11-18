// Cloudflare Pages : mot de passe d'accès au site (même logique que l'edge function Netlify « garde »).
import garde from "../netlify/edge-functions/garde.js";
export const onRequest = (ctx) => garde(ctx.request, { next: () => ctx.next() });

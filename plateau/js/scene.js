// Scène 3D du 1er étage : décor architectural, mobilier, postes réservables, caméra.
// Aucune donnée de disponibilité ici : main.js pousse les états par majEtats().
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ETAGE, MURS_EXT, POSTES_PLAN, ILOTS_PLAN, MOBILIER } from "./plan.js";

const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
const MOBILE = matchMedia("(max-width:820px)").matches || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
const H = ETAGE.hauteur;

// Générateur pseudo-aléatoire stable : le décor est identique à chaque chargement.
function graine(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- Matières ---------- */
// Parquet en point de Hongrie dessiné sur un canvas. PROVISOIRE : sera remplacé par la texture photo quand elle sera fournie.
function textureParquet(renderer) {
  const S = 2048, w = S / 2, h = S / 8, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"), r = graine(7);
  for (let col = 0; col < 2; col++) {
    const s = col ? -1 : 1, x0 = col * w;
    for (let k = -6; k < 14; k++) {
      const y = k * h;
      const l = 44 + r() * 12, t = 29 + r() * 5, sat = 31 + r() * 9;
      x.save(); x.beginPath();
      x.moveTo(x0, y); x.lineTo(x0 + w, y - s * w); x.lineTo(x0 + w, y - s * w + h); x.lineTo(x0, y + h); x.closePath(); x.clip();
      x.fillStyle = `hsl(${t},${sat}%,${l}%)`; x.fillRect(x0, y - w - h, w, 2 * w + 2 * h);
      // veinage dans le sens de la lame
      for (let g = 0; g < 34; g++) {
        const o = r() * (h + 8) - 4, a = 0.03 + r() * 0.07;
        x.strokeStyle = r() > 0.5 ? `rgba(70,45,20,${a})` : `rgba(255,240,215,${a})`; x.lineWidth = 1 + r() * 3;
        x.beginPath(); x.moveTo(x0 - 4, y + o + s * 4); x.lineTo(x0 + w + 4, y + o - s * (w + 4)); x.stroke();
      }
      x.restore();
      x.strokeStyle = "rgba(60,38,18,.6)"; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + w, y - s * w); x.stroke();
    }
    x.strokeStyle = "rgba(60,38,18,.55)"; x.lineWidth = 2.4; x.beginPath(); x.moveTo(x0 + 0.5, 0); x.lineTo(x0 + 0.5, S); x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
function textureChene() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const x = c.getContext("2d"), r = graine(21);
  x.fillStyle = "#BF9A6C"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const y = r() * 512, a = 0.03 + r() * 0.08;
    x.strokeStyle = r() > 0.45 ? `rgba(96,62,28,${a})` : `rgba(255,236,205,${a})`; x.lineWidth = 0.5 + r() * 2.2;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(170, y + r() * 8 - 4, 340, y + r() * 8 - 4, 512, y + r() * 6 - 3); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export async function creerScene(canvas, rappel = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  let sale = 3, pret = false; const demander = () => { sale = Math.max(sale, 2); };
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const cam = new THREE.PerspectiveCamera(30, 1, 0.5, 220);
  const soleil = new THREE.DirectionalLight(0xFFE6C4, 2.3);
  soleil.position.set(-17, 15, -10); soleil.target.position.set(0, 0, 0);
  soleil.castShadow = true; soleil.shadow.mapSize.setScalar(MOBILE ? 2048 : 4096);
  Object.assign(soleil.shadow.camera, { left: -17, right: 17, top: 13, bottom: -13, near: 2, far: 60 });
  soleil.shadow.bias = -0.0003; soleil.shadow.normalBias = 0.025; soleil.shadow.radius = 5;
  scene.add(soleil, soleil.target, new THREE.HemisphereLight(0xFFF8EE, 0xD8C6AC, 1.05));

  const tChene = textureChene(), tParquet = textureParquet(renderer);
  tParquet.repeat.set(24 / 0.54, 15 / 0.54);
  const tVert = new THREE.TextureLoader().load("assets/tissu-vert.jpg", () => demander());
  tVert.colorSpace = THREE.SRGBColorSpace; tVert.wrapS = tVert.wrapT = THREE.RepeatWrapping;
  const M = {
    parquet: new THREE.MeshStandardMaterial({ map: tParquet, roughness: 0.5, metalness: 0 }),
    socle: new THREE.MeshStandardMaterial({ color: 0xEFE8DD, roughness: 0.9 }),
    mur: new THREE.MeshStandardMaterial({ color: 0xF3EEE6, roughness: 0.95 }),
    blanc: new THREE.MeshStandardMaterial({ color: 0xFBF9F5, roughness: 0.7 }),
    chene: new THREE.MeshStandardMaterial({ map: tChene, roughness: 0.55 }),
    cheneFonce: new THREE.MeshStandardMaterial({ map: tChene, color: 0xC9B39A, roughness: 0.6 }),
    acier: new THREE.MeshStandardMaterial({ color: 0x1D1A17, roughness: 0.45, metalness: 0.65 }),
    laiton: new THREE.MeshStandardMaterial({ color: 0xC29A52, roughness: 0.28, metalness: 1 }),
    verre: new THREE.MeshStandardMaterial({ color: 0xDCE8EA, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    feutre: new THREE.MeshStandardMaterial({ map: (() => { const t = tVert.clone(); t.repeat.set(7, 1); return t; })(), color: 0x93A890, roughness: 1 }),
    tapis: new THREE.MeshStandardMaterial({ map: tVert, color: 0x6E8A70, roughness: 1 }),
    boucle: new THREE.MeshStandardMaterial({ color: 0xE9E1D3, roughness: 1 }),
    marbre: new THREE.MeshStandardMaterial({ color: 0xEDEAE4, roughness: 0.25 }),
    ecran: new THREE.MeshStandardMaterial({ color: 0x0E0F12, roughness: 0.2, metalness: 0.3 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xC9CCD0, roughness: 0.35, metalness: 0.9 }),
    lueur: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xEAF1F8, emissiveIntensity: 0.55, roughness: 0.4 }),
    globe: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFE2B8, emissiveIntensity: 1.5, roughness: 0.3 }),
    ceramique: new THREE.MeshStandardMaterial({ color: 0xF4EFE6, roughness: 0.35 }),
    encre: new THREE.MeshStandardMaterial({ color: 0x2B3A33, roughness: 0.8 }),
    grisClair: new THREE.MeshStandardMaterial({ color: 0xD9D6D0, roughness: 0.6 }),
  };
  tVert.repeat.set(2, 2);

  const monde = new THREE.Group(); scene.add(monde);
  const om = (m, o = {}) => { m.castShadow = o.ombre !== false; m.receiveShadow = true; return m; };
  const boite = (w, h, d, mat, x = 0, y = 0, z = 0, o) => { const m = om(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), o); m.position.set(x, y + h / 2, z); return m; };
  const rond = (w, h, d, r, mat, x = 0, y = 0, z = 0, o) => { const m = om(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), mat), o); m.position.set(x, y + h / 2, z); return m; };
  const cyl = (r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 28, o) => { const m = om(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat), o); m.position.set(x, y + h / 2, z); return m; };

  /* ---------- Sol et socle ---------- */
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(24, 15), M.parquet); sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; monde.add(sol);
  monde.add(boite(24.44, 0.42, 15.44, M.socle, 0, -0.421, 0));
  const table = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: 0.085 })); table.rotation.x = -Math.PI / 2; table.position.y = -0.42; table.receiveShadow = true; monde.add(table);
  // Tapis du lounge
  const tapis = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.018, 2.7, 3, 0.009), M.tapis); tapis.position.set(9, 0.009, 2.95); tapis.receiveShadow = true; monde.add(tapis);

  /* ---------- Murs ---------- */
  // Chaque mur a une partie haute qui s'efface quand elle masque la vue. La plinthe reste pour lire le plan.
  const murs = [];
  function partieHaute(n, milieu) {
    const g = new THREE.Group(); monde.add(g);
    const mats = { mur: M.mur.clone(), blanc: M.blanc.clone(), verre: M.verre.clone(), acier: M.acier.clone() };
    Object.values(mats).forEach(m => { m.userData.base = m.opacity; m.transparent = true; });
    murs.push({ g, mats, n: new THREE.Vector3(n[0], 0, n[1]), milieu: new THREE.Vector3(milieu[0], 1.2, milieu[1]), k: 1 });
    return { g, mats };
  }
  const EP = 0.22, LF = 1.3, ALLEGE = 0.32, LINTEAU = 2.56;
  for (const mu of MURS_EXT) {
    const dx = mu.b[0] - mu.a[0], dz = mu.b[1] - mu.a[1], L = Math.hypot(dx, dz), enX = Math.abs(dx) > 0;
    const { g, mats } = partieHaute(mu.n, [(mu.a[0] + mu.b[0]) / 2, (mu.a[1] + mu.b[1]) / 2]);
    // repère local : u le long du mur, centré ; le mur dépasse vers l'extérieur
    const place = (m, u, y, dec = 0) => { const off = EP / 2 + dec; if (enX) m.position.set(u, m.position.y + y, mu.a[1] + mu.n[1] * off); else m.position.set(mu.a[0] + mu.n[0] * off, m.position.y + y, u); return m; };
    const seg = (u1, u2, y1, y2, mat) => { const l = u2 - u1; if (l <= 0.001) return; const m = boite(enX ? l : EP, y2 - y1, enX ? EP : l, mat); g.add(place(m, (u1 + u2) / 2, y1)); };
    const u0 = -L / 2 - EP, u1 = L / 2 + EP, centre = enX ? (mu.a[0] + mu.b[0]) / 2 : (mu.a[1] + mu.b[1]) / 2;
    // plinthe permanente
    const pl = boite(enX ? L + 2 * EP : EP, 0.14, enX ? EP : L + 2 * EP, M.mur); place(pl, centre, 0); monde.add(pl);
    let cur = u0 + centre;
    const fen = [...mu.fenetres].sort((a, b) => a - b);
    for (const f of fen) {
      seg(cur, f - LF / 2, 0.14, H, mats.mur);
      seg(f - LF / 2, f + LF / 2, 0.14, ALLEGE, mats.mur);
      seg(f - LF / 2, f + LF / 2, LINTEAU, H, mats.mur);
      // menuiserie blanche et vitrage
      const hF = LINTEAU - ALLEGE, cadre = 0.055;
      const piece = (lu, hy, u, y, mat, dec = -0.04) => { const m = boite(enX ? lu : cadre, hy, enX ? cadre : lu, mat, 0, 0, 0, { ombre: false }); g.add(place(m, u, y, dec)); };
      piece(LF, cadre, f, ALLEGE, mats.blanc); piece(LF, cadre, f, LINTEAU - cadre, mats.blanc);
      piece(cadre, hF, f - LF / 2 + cadre / 2, ALLEGE, mats.blanc); piece(cadre, hF, f + LF / 2 - cadre / 2, ALLEGE, mats.blanc);
      piece(cadre * 0.8, hF, f, ALLEGE, mats.blanc);
      [0.36, 0.68].forEach(t => piece(LF, cadre * 0.6, f, ALLEGE + hF * t, mats.blanc));
      const v = new THREE.Mesh(new THREE.PlaneGeometry(LF, hF), mats.verre); v.position.y = hF / 2; if (!enX) v.rotation.y = Math.PI / 2; g.add(place(v, f, ALLEGE, -0.04));
      // tablette de fenêtre
      const tb = boite(enX ? LF + 0.1 : 0.3, 0.035, enX ? 0.3 : LF + 0.1, mats.blanc); g.add(place(tb, f, ALLEGE - 0.035, -EP / 2 - 0.02));
      cur = f + LF / 2;
    }
    seg(cur, u1 + centre, 0.14, H, mats.mur);
  }
  // Cloison pleine entre la bibliothèque et le lounge (z = 0,5)
  {
    const { g, mats } = partieHaute([0, 1], [9, 0.5]);
    g.add(boite(6, H - 0.14, 0.14, mats.mur, 9, 0.14, 0.5));
    monde.add(boite(6, 0.14, 0.14, M.mur, 9, 0, 0.5));
  }
  // Verrière d'atelier de la bibliothèque (x = 6, de z = −7,5 à 0,5), porte ouverte côté sud
  {
    const g = new THREE.Group(); monde.add(g);
    const z1 = -7.5, z2 = -0.75, bas = 0.9, haut = 2.5, L = z2 - z1;
    g.add(boite(0.1, bas, L, M.mur, 6, 0, (z1 + z2) / 2));
    g.add(boite(0.12, 0.03, L + 0.02, M.acier, 6, bas, (z1 + z2) / 2));
    g.add(boite(0.05, 0.05, L, M.acier, 6, haut - 0.05, (z1 + z2) / 2), boite(0.035, 0.03, L, M.acier, 6, 1.75, (z1 + z2) / 2, { ombre: false }));
    const n = 9; for (let i = 0; i <= n; i++) g.add(boite(0.04, haut - bas, 0.04, M.acier, 6, bas, z1 + L * i / n));
    const v = new THREE.Mesh(new THREE.PlaneGeometry(L, haut - bas - 0.05), M.verre); v.rotation.y = Math.PI / 2; v.position.set(6, (bas + haut) / 2, (z1 + z2) / 2); g.add(v);
    // montant et imposte de la porte
    g.add(boite(0.05, haut, 0.05, M.acier, 6, 0, 0.45), boite(0.05, 0.05, 1.2, M.acier, 6, haut - 0.05, -0.15));
  }
  // Claustras en chêne entre l'open space et le lounge (x = 6)
  {
    const zs = []; for (let z = 0.75; z <= 2.4; z += 0.15) zs.push(z); for (let z = 5.6; z <= 7.3; z += 0.15) zs.push(z);
    const im = om(new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 2.05, 0.035), M.chene, zs.length)); const o = new THREE.Object3D();
    zs.forEach((z, i) => { o.position.set(6, 1.065, z); o.rotation.y = 0.5; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); monde.add(im);
    [[0.66, 2.49], [5.51, 7.39]].forEach(([a, b]) => { monde.add(boite(0.14, 0.04, b - a, M.chene, 6, 0, (a + b) / 2), boite(0.14, 0.04, b - a, M.chene, 6, 2.09, (a + b) / 2)); });
  }

  /* ---------- Modèles ---------- */
  const chargeur = new GLTFLoader();
  const charger = url => new Promise(res => chargeur.load(url, g => {
    const s = g.scene; s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 4; } });
    // recentre : base au sol, centre en x et z
    const b = new THREE.Box3().setFromObject(s), c = b.getCenter(new THREE.Vector3()), t = b.getSize(new THREE.Vector3());
    const pivot = new THREE.Group(); s.position.set(-c.x, -b.min.y, -c.z); pivot.add(s); pivot.userData.taille = t; res(pivot);
  }, undefined, () => res(null)));
  const [gChaise, gCanape, gFicus, gAppoint] = await Promise.all(["chaise", "canape", "ficus", "table-appoint"].map(n => charger(`assets/${n}.glb`)));
  const pose = (modele, x, z, o = {}) => {
    if (!modele) return null;
    const g = new THREE.Group(), c = modele.clone(true), t = modele.userData.taille;
    const e = o.hauteur ? o.hauteur / t.y : o.largeur ? o.largeur / t.x : 1; c.scale.setScalar(e);
    c.rotation.y = o.orient || 0; g.add(c); g.position.set(x, o.y || 0, z); g.rotation.y = o.rot || 0; return g;
  };
  // PROVISOIRE : chaise de secours si le modèle ne charge pas
  const chaiseSecours = () => { const g = new THREE.Group(); g.add(rond(0.46, 0.07, 0.46, 0.03, M.encre, 0, 0.43, 0), rond(0.44, 0.42, 0.06, 0.03, M.encre, 0, 0.52, 0.21), cyl(0.025, 0.025, 0.43, M.acier), cyl(0.26, 0.26, 0.025, M.acier)); return g; };
  const ORIENT_CHAISE = 0;
  const chaise = (x, z, rot, hauteur = 0.93) => pose(gChaise, x, z, { hauteur, orient: ORIENT_CHAISE, rot }) || (() => { const g = chaiseSecours(); g.position.set(x, 0, z); g.rotation.y = rot; return g; })();

  /* ---------- Postes ---------- */
  const postes = new Map(), cibles = [];
  const haloForme = (() => { const f = (w, d, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return s; };
    const ext = f(1.62, 1.56, 0.12), int = f(1.56, 1.50, 0.09); ext.holes.push(int); return { anneau: new THREE.ShapeGeometry(ext, 12), fond: new THREE.ShapeGeometry(f(1.56, 1.5, 0.09), 12) }; })();
  const creerHalo = (couleur, fondOp) => { const g = new THREE.Group();
    const a = new THREE.Mesh(haloForme.anneau, new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0, depthWrite: false }));
    const f = new THREE.Mesh(haloForme.fond, new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0, depthWrite: false }));
    g.add(a, f); g.rotation.x = -Math.PI / 2; g.userData = { a, f, fondOp, k: 0, cible: 0 }; g.visible = false; monde.add(g); return g; };
  const haloSurvol = creerHalo(0x19110B, 0.05), haloChoix = creerHalo(0xB8914E, 0.24);
  const poserHalo = (h, p) => { if (!p) { h.userData.cible = 0; return; } h.position.set(p.g.position.x, 0.012, p.g.position.z); h.rotation.z = -p.plan.rot; h.translateY(0.33); h.visible = true; h.userData.cible = 1; };

  const matCible = new THREE.MeshBasicMaterial({ visible: false });
  for (const plan of POSTES_PLAN) {
    const g = new THREE.Group(); g.position.set(plan.x, 0, plan.z); g.rotation.y = plan.rot; monde.add(g);
    const debout = plan.zone === "debout", hp = debout ? 1.06 : 0.725;
    g.add(rond(1.46, 0.036, 0.66, 0.012, M.chene, 0, hp, 0));
    if (debout) { [-0.56, 0.56].forEach(x => g.add(rond(0.075, hp - 0.03, 0.055, 0.012, M.acier, x, 0.03, 0.04), rond(0.07, 0.03, 0.62, 0.012, M.acier, x, 0, 0))); g.add(boite(1.1, 0.04, 0.05, M.acier, 0, hp - 0.04, 0.04)); }
    else { [-0.66, 0.66].forEach(x => { g.add(boite(0.03, hp, 0.03, M.acier, x, 0, -0.27), boite(0.03, hp, 0.03, M.acier, x, 0, 0.27), boite(0.03, 0.03, 0.54, M.acier, x, hp - 0.03, 0)); }); }
    // passe-câbles en laiton
    g.add(cyl(0.028, 0.028, 0.004, M.laiton, 0.52, hp + 0.036, 0.2, 20, { ombre: false }));
    if (plan.zone === "ecran") [-0.31, 0.31].forEach((x, i) => { const e = new THREE.Group();
      e.add(rond(0.6, 0.35, 0.018, 0.008, M.ecran, 0, 0.13, 0), boite(0.035, 0.14, 0.03, M.alu, 0, 0, 0.02), rond(0.2, 0.012, 0.15, 0.005, M.alu, 0, 0, 0.02));
      e.position.set(x, hp + 0.036, 0.17); e.rotation.y = i ? -0.13 : 0.13; g.add(e); });
    // siège
    const ch = chaise(0, -0.5, 0, debout ? 1.06 : 0.93); g.add(ch);
    // signes d'occupation : portable, tasse, carnet
    const occ = new THREE.Group(); occ.visible = false; g.add(occ);
    const base = rond(0.32, 0.014, 0.22, 0.006, M.alu, 0, hp + 0.036, -0.08);
    const cap = new THREE.Group(); cap.position.set(0, hp + 0.05, 0.03); cap.rotation.x = -0.3;
    cap.add(rond(0.32, 0.21, 0.008, 0.004, M.alu, 0, 0, 0), (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), M.lueur); m.position.set(0, 0.105, -0.0045); m.rotation.y = Math.PI; return m; })());
    occ.add(base, cap, cyl(0.038, 0.032, 0.085, M.ceramique, 0.42, hp + 0.036, -0.1, 20), rond(0.15, 0.014, 0.21, 0.004, M.encre, -0.44, hp + 0.036, -0.06));
    occ.children[3].rotation.y = 0.25;
    // zone cliquable
    [[1.5, hp + 0.1, 0.68, 0, (hp + 0.1) / 2, 0], [0.72, debout ? 1.1 : 0.98, 0.74, 0, (debout ? 1.1 : 0.98) / 2, -0.62]].forEach(([w, h, d, x, y, z]) => { const cible = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matCible); cible.position.set(x, y, z); cible.userData.code = plan.code; g.add(cible); cibles.push(cible); });
    postes.set(plan.code, { plan, g, ch, occ, etat: null, repere: new THREE.Vector3(plan.x, hp + 0.3, plan.z) });
  }
  // Écran de feutre et suspensions de chaque îlot
  ILOTS_PLAN.forEach(il => {
    const hp = il.zone === "debout" ? 1.06 : 0.725;
    monde.add(rond(2.9, 0.4, 0.028, 0.012, M.feutre, il.cx, hp + 0.04, il.cz));
    [-0.75, 0.75].forEach(dx => { monde.add(cyl(0.004, 0.004, H - 2.12, M.acier, il.cx + dx, 2.12, il.cz, 6, { ombre: false }), cyl(0.03, 0.045, 0.05, M.laiton, il.cx + dx, 2.08, il.cz, 20));
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 20), M.globe); gl.position.set(il.cx + dx, 1.99, il.cz); gl.castShadow = true; monde.add(gl); });
  });

  /* ---------- Mobilier ---------- */
  const r = graine(99);
  // Plantes (le même ficus à différentes tailles. PROVISOIRE : d'autres essences viendront avec les modèles manquants)
  MOBILIER.plantes.forEach(([x, z, h], i) => { const p = pose(gFicus, x, z, { hauteur: h, rot: i * 1.7 }); if (p) monde.add(p); else monde.add(cyl(0.2, 0.16, 0.4, M.ceramique, x, 0, z), (() => { const m = om(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: 0x4F6F52, roughness: 1 }))); m.position.set(x, 1, z); return m; })()); });
  // Bibliothèques en chêne et livres
  const livres = []; const PAL = [0x2B3A33, 0x4F6F52, 0xE9E1D3, 0xC8B79C, 0x19110B, 0x7A8F9B, 0xB8914E, 0x8C4A3A, 0xF4EFE6, 0x3F4B5A];
  MOBILIER.bibliotheques.forEach(b => {
    const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.rot; monde.add(g);
    const Hh = b.h || 1.92, P = 0.3, n = Math.round(b.l / 0.8), niveaux = b.h ? 3 : 5;
    g.add(boite(b.l, 0.03, P, M.chene, 0, Hh, 0), boite(b.l, 0.08, P - 0.02, M.chene, 0, 0, 0));
    for (let i = 0; i <= n; i++) g.add(boite(0.024, Hh, P, M.chene, -b.l / 2 + 0.012 + (b.l - 0.024) * i / n, 0, 0));
    for (let k = 1; k < niveaux; k++) g.add(boite(b.l - 0.03, 0.022, P - 0.01, M.chene, 0, 0.08 + (Hh - 0.08) * k / niveaux, 0));
    for (let k = 0; k < niveaux; k++) for (let i = 0; i < n; i++) {
      const y = 0.08 + (Hh - 0.08) * k / niveaux + (k ? 0.022 : 0), x0 = -b.l / 2 + 0.03 + (b.l - 0.024) * i / n, larg = (b.l - 0.024) / n - 0.04, mode = r();
      if (mode < 0.14) continue;
      if (mode < 0.26) { const o = cyl(0.05 + r() * 0.03, 0.035, 0.13 + r() * 0.1, r() > 0.5 ? M.ceramique : M.laiton, x0 + larg / 2, y, 0, 20); g.add(o); continue; }
      let x = x0; const fin = x0 + larg * (0.55 + r() * 0.45);
      while (x < fin) { const e = 0.022 + r() * 0.03, h = 0.19 + r() * 0.1, d = 0.15 + r() * 0.06; livres.push({ g, x: x + e / 2, y: y + h / 2, z: (r() - 0.5) * 0.03, e, h, d, c: PAL[Math.floor(r() * PAL.length)] }); x += e + 0.002; }
    }
  });
  { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 }), livres.length); im.castShadow = false; im.receiveShadow = true;
    const o = new THREE.Object3D(), c = new THREE.Color(), mm = new THREE.Matrix4();
    livres.forEach((l, i) => { l.g.updateMatrixWorld(); o.position.set(l.x, l.y, l.z); o.scale.set(l.e, l.h, l.d); o.rotation.set(0, 0, 0); o.updateMatrix(); mm.multiplyMatrices(l.g.matrixWorld, o.matrix); im.setMatrixAt(i, mm); im.setColorAt(i, c.setHex(l.c)); }); monde.add(im); }
  // Lounge
  { const c = MOBILIER.canape, s = pose(gCanape, c.x, 1.2, { largeur: 2.5, rot: c.rot }); if (s) monde.add(s); else monde.add(rond(2.4, 0.42, 0.95, 0.12, M.boucle, c.x, 0.05, 1.2), rond(2.4, 0.5, 0.25, 0.1, M.boucle, c.x, 0.3, 0.85));
    const [tx, tz] = MOBILIER.tableBasse; monde.add(cyl(0.48, 0.48, 0.035, M.chene, tx, 0.34, tz, 48), cyl(0.05, 0.2, 0.34, M.laiton, tx, 0, tz, 32));
    monde.add(cyl(0.11, 0.11, 0.012, M.encre, tx - 0.12, 0.375, tz + 0.05, 24, { ombre: false }), cyl(0.036, 0.03, 0.08, M.ceramique, tx + 0.2, 0.375, tz - 0.1, 20), rond(0.2, 0.025, 0.27, 0.005, M.grisClair, tx - 0.05, 0.375, tz - 0.2));
    MOBILIER.poufs.forEach(([x, z], i) => monde.add((() => { const m = om(new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.4, 0.68, 6, 0.19), i ? M.boucle : M.tapis)); m.position.set(x, 0.2, z); m.rotation.y = 0.3 * (i ? -1 : 1); return m; })()));
    const [ax, az] = MOBILIER.tableAppoint; const ap = pose(gAppoint, ax, az - 0.3, { hauteur: 0.52 }); if (ap) monde.add(ap);
    // lampadaire
    monde.add(cyl(0.15, 0.16, 0.02, M.laiton, 7.05, 0, 1.05, 32), cyl(0.012, 0.012, 1.5, M.laiton, 7.05, 0.02, 1.05, 12)); const gl = om(new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), M.globe)); gl.position.set(7.05, 1.62, 1.05); monde.add(gl);
    // table haute partagée et ses quatre chaises
    const t = MOBILIER.tableHaute; monde.add(rond(1.8, 0.04, 0.9, 0.015, M.chene, t.x, 0.71, t.z)); [[-0.78, -0.36], [0.78, -0.36], [-0.78, 0.36], [0.78, 0.36]].forEach(([dx, dz]) => monde.add(cyl(0.022, 0.016, 0.71, M.acier, t.x + dx, 0, t.z + dz, 12)));
    [[-0.45, -0.72, 0], [0.45, -0.72, 0], [-0.45, 0.72, Math.PI], [0.45, 0.72, Math.PI]].forEach(([dx, dz, rot]) => monde.add(chaise(t.x + dx, t.z + dz, rot)));
    monde.add(cyl(0.07, 0.05, 0.16, M.ceramique, t.x, 0.75, t.z, 24));
    // comptoir café
    const [cx, cz] = MOBILIER.cafe; monde.add(rond(1.7, 0.9, 0.6, 0.01, M.cheneFonce, cx + 0.3, 0, cz + 0.2), rond(1.76, 0.03, 0.64, 0.008, M.marbre, cx + 0.3, 0.9, cz + 0.2), rond(0.36, 0.38, 0.34, 0.03, M.acier, cx - 0.1, 0.93, cz + 0.25), cyl(0.012, 0.012, 0.1, M.laiton, cx - 0.1, 1.0, cz + 0.05, 10));
    for (let i = 0; i < 4; i++) monde.add(cyl(0.035, 0.028, 0.06, M.ceramique, cx + 0.45 + (i % 2) * 0.1, 0.93, cz + 0.12 + Math.floor(i / 2) * 0.1, 16));
    // imprimante sur son meuble
    const [ix, iz] = MOBILIER.imprimante; monde.add(rond(0.95, 0.7, 0.5, 0.01, M.cheneFonce, ix - 0.1, 0, iz + 0.4), rond(0.52, 0.3, 0.42, 0.03, M.grisClair, ix - 0.1, 0.7, iz + 0.4), boite(0.3, 0.012, 0.2, M.ecran, ix - 0.1, 1.0, iz + 0.34, { ombre: false }));
  }

  /* ---------- Caméra ---------- */
  const controles = new OrbitControls(cam, canvas);
  Object.assign(controles, { enableDamping: !RM, dampingFactor: 0.08, minDistance: 5, maxDistance: 130, minPolarAngle: 0.12, maxPolarAngle: 1.36, rotateSpeed: 0.55, zoomSpeed: 0.8, panSpeed: 0.7, screenSpacePanning: false });
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const CENTRE = new THREE.Vector3(0, 0.6, 0.2);
  let decalage = { x: 0, y: 0 }, decalageCible = { x: 0, y: 0 };
  const distanceEnsemble = () => { const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), th = tv * cam.aspect; return (cam.aspect < 1 ? Math.max(15.5 / tv, 9.6 / th) : Math.max(11.2 / tv, 15.2 / th)) * 1.04; };
  const poseEnsemble = () => { const d = distanceEnsemble(), el = cam.aspect < 1 ? 0.92 : 0.74, az = cam.aspect < 1 ? 1.32 : 0.42; return { p: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(CENTRE), c: CENTRE.clone() }; };
  let anim = null;
  const doux = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function aller(p, c, duree = 1.25) {
    if (RM || duree <= 0) { cam.position.copy(p); controles.target.copy(c); anim = null; demander(); return; }
    anim = { p0: cam.position.clone(), c0: controles.target.clone(), p, c, t0: performance.now(), duree: duree * 1000 };
  }
  controles.addEventListener("start", () => { anim = null; rappel.onGeste && rappel.onGeste(); });
  controles.addEventListener("change", () => { const t = controles.target; t.x = THREE.MathUtils.clamp(t.x, -12, 12); t.z = THREE.MathUtils.clamp(t.z, -7.5, 7.5); t.y = THREE.MathUtils.clamp(t.y, 0, 2); });

  /* ---------- Survol et clic ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2(); let survol = null, choix = null, bas = null, filtre = null;
  const viser = e => { const b = canvas.getBoundingClientRect(); souris.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); rayon.setFromCamera(souris, cam); const t = rayon.intersectObjects(cibles, false)[0]; return t ? t.object.userData.code : null; };
  const majSurvol = code => { if (code === survol) return; survol = code; poserHalo(haloSurvol, code && code !== choix ? postes.get(code) : null); canvas.style.cursor = code ? "pointer" : ""; rappel.onSurvol && rappel.onSurvol(code); demander(); };
  canvas.addEventListener("pointermove", e => { if (e.pointerType === "touch" || e.buttons) return; majSurvol(viser(e)); });
  canvas.addEventListener("pointerleave", () => majSurvol(null));
  canvas.addEventListener("pointerdown", e => { bas = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener("pointerup", e => { if (!bas) return; const d = Math.hypot(e.clientX - bas.x, e.clientY - bas.y), dt = performance.now() - bas.t; bas = null; if (d > 6 || dt > 600) return; const code = viser(e); rappel.onChoix && rappel.onChoix(code); });

  /* ---------- Boucle de rendu (à la demande) ---------- */
  const v3 = new THREE.Vector3();
  function taille() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = cam.aspect < 1 ? 38 : 30; cam.updateProjectionMatrix(); demander();
  }
  new ResizeObserver(taille).observe(canvas); taille();
  function image(now) {
    requestAnimationFrame(image);
    if (document.hidden || !pret) return;
    let bouge = false;
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.duree), e = doux(k); cam.position.lerpVectors(anim.p0, anim.p, e); controles.target.lerpVectors(anim.c0, anim.c, e); if (k >= 1) anim = null; bouge = true; }
    if (controles.update()) bouge = true;
    // décalage de vue : le poste choisi reste visible à côté de la fiche
    if (Math.abs(decalage.x - decalageCible.x) > 0.5 || Math.abs(decalage.y - decalageCible.y) > 0.5) { const f = RM ? 1 : 0.12; decalage.x += (decalageCible.x - decalage.x) * f; decalage.y += (decalageCible.y - decalage.y) * f; bouge = true; }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (Math.abs(decalage.x) > 0.5 || Math.abs(decalage.y) > 0.5) cam.setViewOffset(w, h, decalage.x, decalage.y, w, h); else if (cam.view) cam.clearViewOffset();
    // murs : la partie haute s'efface quand la caméra passe derrière
    for (const m of murs) { const cible = v3.copy(cam.position).sub(m.milieu).dot(m.n) > 0.4 ? 0 : 1; if (Math.abs(cible - m.k) > 0.004) { m.k += (cible - m.k) * (RM ? 1 : 0.14); bouge = true; } else m.k = cible;
      for (const mat of Object.values(m.mats)) { mat.opacity = mat.userData.base * m.k; mat.depthWrite = m.k > 0.98 && mat.userData.base === 1; } m.g.traverse(o => { if (o.isMesh) o.renderOrder = m.k < 0.98 ? 5 : 0; }); }
    for (const hl of [haloSurvol, haloChoix]) { const u = hl.userData; if (Math.abs(u.cible - u.k) > 0.01) { u.k += (u.cible - u.k) * (RM ? 1 : 0.2); bouge = true; } else u.k = u.cible; u.a.material.opacity = u.k * 0.9; u.f.material.opacity = u.k * u.fondOp; if (u.k < 0.01 && !u.cible) hl.visible = false; }
    if (bouge) sale = Math.max(sale, 2);
    if (sale > 0) { sale--; renderer.render(scene, cam); rappel.onImage && rappel.onImage(); }
  }

  const api = {
    codes: POSTES_PLAN.map(p => p.code),
    demarrer() {
      const e = poseEnsemble(); pret = true;
      if (RM) { aller(e.p, e.c, 0); } else { cam.position.set(CENTRE.x + 0.01, distanceEnsemble() * 1.25, CENTRE.z + 2); controles.target.copy(CENTRE); controles.update(); aller(e.p, e.c, 2.4); }
      requestAnimationFrame(image);
    },
    // états : { C01: "libre" | "pris" | "passe" }
    majEtats(etats) { postes.forEach((p, code) => { const e = etats ? etats[code] : null; p.etat = e; const pris = e === "pris"; p.occ.visible = pris; p.ch.position.z = pris ? -0.66 : -0.5; p.ch.rotation.y = pris ? ((code.charCodeAt(2) * 7) % 5 - 2) * 0.16 : 0; }); demander(); },
    choisir(code, o = {}) {
      choix = code; poserHalo(haloChoix, code ? postes.get(code) : null); if (code === survol) poserHalo(haloSurvol, null);
      if (code && o.camera !== false) { const p = postes.get(code), c = new THREE.Vector3(p.plan.x, 0.75, p.plan.z);
        const dir = v3.copy(cam.position).sub(controles.target), az = Math.atan2(dir.x, dir.z);
        // on garde l'orientation en cours : la caméra descend vers le poste sans faire le tour de l'étage
        const el = 0.74, d = cam.aspect < 1 ? 16 : 10.5; aller(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(c), c, 1.2); }
      demander();
    },
    cadrerZone(zone) { filtre = zone; if (!zone) return; const ps = POSTES_PLAN.filter(p => p.zone === zone); const c = new THREE.Vector3(ps.reduce((s, p) => s + p.x, 0) / ps.length, 0.6, ps.reduce((s, p) => s + p.z, 0) / ps.length);
      const etendue = Math.max(...ps.map(p => Math.hypot(p.x - c.x, p.z - c.z))); const d = Math.max(16, (etendue + 3.2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / Math.min(1, cam.aspect) * 0.62), el = 0.78, dir = v3.copy(cam.position).sub(controles.target), az = Math.atan2(dir.x, dir.z);
      aller(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(c), c, 1.3); },
    vueEnsemble() { const e = poseEnsemble(); aller(e.p, e.c, 1.3); },
    decaler(x, y) { decalageCible = { x, y }; demander(); },
    // position écran du repère d'un poste
    projeter(code) { const p = postes.get(code); if (!p) return null; v3.copy(p.repere).project(cam); const w = canvas.clientWidth, h = canvas.clientHeight; return { x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h, visible: v3.z < 1 && v3.z > -1 }; },
    projeterPoint(x, y, z) { v3.set(x, y, z).project(cam); const w = canvas.clientWidth, h = canvas.clientHeight; return { x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h, visible: v3.z < 1 && v3.z > -1 }; },
    distance() { return cam.position.distanceTo(controles.target); },
    loin() { return cam.position.distanceTo(controles.target) > distanceEnsemble() * 0.8; },
    demander,
  };
  return api;
}

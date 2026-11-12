// Plan du 1er étage, repris du plan Nexudus (floor plan 1415059895). Unités : mètres.
// Origine au centre de l'étage. x = (X − 52 000) / 1000, z = (Y − 47 500) / 1000 par rapport aux coordonnées Nexudus.
// Ce fichier ne contient que l'implantation : aucune disponibilité, aucun prix.

export const ETAGE = { x1: -12, x2: 12, z1: -7.5, z2: 7.5, hauteur: 2.9 };

// Zones du plan Nexudus.
export const ZONES_PLAN = [
  { nom: "Open space coworking", x1: -12, z1: -7.5, x2: 6, z2: 7.5 },
  { nom: "Bibliothèque silencieuse", x1: 6, z1: -7.5, x2: 12, z2: 0.5 },
  { nom: "Lounge & impression", x1: 6, z1: 0.5, x2: 12, z2: 7.5 },
];

// Murs extérieurs. n = normale vers l'extérieur. fenetres : centres le long du mur.
// PROVISOIRE : la position des fenêtres ne figure pas dans le plan Nexudus, elle est proposée ici.
export const MURS_EXT = [
  { id: "ouest", a: [-12, -7.5], b: [-12, 7.5], n: [-1, 0], fenetres: [-5.6, -2.8, 0, 2.8, 5.6] },
  { id: "nord", a: [-12, -7.5], b: [12, -7.5], n: [0, -1], fenetres: [-9, -6, -3, 0, 3, 9] },
  { id: "est", a: [12, -7.5], b: [12, 7.5], n: [1, 0], fenetres: [] },
  { id: "sud", a: [-12, 7.5], b: [12, 7.5], n: [0, 1], fenetres: [] },
];

// Îlots de quatre postes dos à dos (positions des tables et chaises du plan Nexudus).
// ordre des postes dans un îlot : nord-ouest, nord-est, sud-ouest, sud-est.
const ILOTS = [
  { cx: -7.5, cz: -4.0, zone: "fenetre" }, // C01–C04
  { cx: 0.5, cz: -4.0, zone: "debout" },   // C05–C08
  { cx: -7.5, cz: 3.7, zone: "fenetre" },  // C09–C12
  { cx: 0.5, cz: 3.7, zone: "ecran" },     // C13–C16
  { cx: 9.0, cz: -3.5, zone: "calme" },    // C17–C20
];

// Objets réservables : un poste = un code (C01…C20) relié à la ressource Nexudus par son nom.
export const POSTES_PLAN = ILOTS.flatMap((il, i) =>
  [[-0.75, -0.35, 0], [0.75, -0.35, 0], [-0.75, 0.35, Math.PI], [0.75, 0.35, Math.PI]].map(([dx, dz, rot], k) => ({
    code: "C" + String(i * 4 + k + 1).padStart(2, "0"),
    nom: "Poste C" + String(i * 4 + k + 1).padStart(2, "0"),
    zone: il.zone, ilot: i, x: il.cx + dx, z: il.cz + dz, rot,
  })));
export const ILOTS_PLAN = ILOTS;

export const ZONES = {
  fenetre: { nom: "Côté fenêtre", texte: "Face au boulevard, la meilleure lumière de l'étage.", equipements: ["Lumière naturelle", "Bureau en chêne 150 cm", "Fibre et prises intégrées", "Casier à la journée"] },
  debout: { nom: "Assis-debout", texte: "Plateau réglable en hauteur, pour les longues journées.", equipements: ["Bureau assis-debout", "Fibre et prises intégrées", "Casier à la journée"] },
  ecran: { nom: "Double écran", texte: "Deux écrans 27 pouces, pour les dossiers à comparer.", equipements: ["Deux écrans 27 pouces", "Station d'accueil USB-C", "Fibre et prises intégrées", "Casier à la journée"] },
  calme: { nom: "Bibliothèque", titre: "Bibliothèque silencieuse", texte: "Derrière la verrière d'atelier. Ici, on ne téléphone pas.", equipements: ["Zone silencieuse", "Bureau en chêne 150 cm", "Fibre et prises intégrées", "Casier à la journée"] },
};

// Mobilier non réservable (positions du plan Nexudus).
export const MOBILIER = {
  plantes: [[-11.3, -6.8, 1.9], [-11.3, 6.8, 2.1], [5.2, -6.8, 1.7], [-3.5, -0.2, 2.3], [11.3, 1.3, 1.8]],
  bibliotheques: [{ x: -3.5, z: 7.15, rot: Math.PI, l: 3.2, h: 1.12 }, { x: 11.65, z: -3.5, rot: -Math.PI / 2, l: 6.4 }],
  canape: { x: 9.0, z: 1.55, rot: 0 },
  poufs: [[7.9, 3.35], [10.1, 3.35]],
  tableBasse: [9.0, 2.75],
  tableAppoint: [10.75, 1.5],
  tableHaute: { x: 9.0, z: 5.6 },
  imprimante: [11.45, 6.75],
  cafe: [6.95, 6.95],
};

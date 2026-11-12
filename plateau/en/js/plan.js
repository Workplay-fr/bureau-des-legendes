// Fichier généré par outils/en.py à partir de la version française : ne pas modifier à la main.
// Plan du 1er étage : les postes réservables et leur position sur le rendu du plateau.
// Le rendu (assets/plateau-2x.webp) est une image générée d'après l'implantation Nexudus ; ses coordonnées sont
// exprimées dans le repère d'origine de l'image, 1536 × 1024. Ce fichier ne contient ni disponibilité ni prix.

export const IMAGE = {
  l: 1536, h: 1024, src: "/plateau/assets/plateau-2x.webp", leger: "/plateau/assets/plateau.webp", maquette: [70, 110, 1440, 990],
  // Contours relevés sur l'image : emprise du sol, silhouette de la maquette, arêtes des murs (tracé d'ouverture, lumière, ombre)
  sol: [[455, 290], [1415, 455], [1250, 972], [78, 655]],
  silhouette: [[72, 508], [460, 122], [1424, 343], [1424, 470], [1256, 988], [70, 670]],
  murs: [[[78, 655], [75, 510], [460, 125], [455, 290]], [[460, 125], [1420, 345], [1415, 455]], [[1148, 292], [1148, 402], [1030, 625], [1030, 520], [1148, 292]], [[1030, 625], [1335, 640]], [[905, 800], [935, 700]], [[985, 715], [1010, 610]]],
  // Rendus de l'étage sous une autre lumière, par créneau (même cadrage que l'image principale, vérifié au pixel près).
  ambiances: { matin: "/plateau/assets/plateau-matin-2x.webp", apres: "/plateau/assets/plateau-apres-2x.webp" },
};

// Un îlot = quatre postes dos à dos. cadre : zone de l'image qui le contient.
// Chaque poste : [x, y du repère posé sur le plateau, x, y du fauteuil]. Ordre : fond gauche, fond droit, devant gauche, devant droit.
const ILOTS = [
  { zone: "fenetre", cadre: [455, 255, 665, 420], postes: [[545, 303, 555, 290], [615, 318, 622, 308], [515, 338, 502, 370], [588, 352, 572, 385]] }, // C01–C04
  { zone: "debout", cadre: [755, 325, 965, 505], postes: [[845, 371, 850, 361], [912, 387, 924, 379], [817, 402, 806, 450], [892, 420, 879, 464]] },   // C05–C08
  { zone: "fenetre", cadre: [275, 455, 490, 630], postes: [[360, 503, 377, 489], [432, 519, 445, 506], [337, 537, 320, 567], [410, 555, 387, 584]] }, // C09–C12
  { zone: "ecran", cadre: [605, 540, 825, 735], postes: [[706, 588, 710, 579], [785, 604, 787, 596], [662, 650, 649, 672], [750, 665, 732, 690]] },   // C13–C16
  { zone: "calme", cadre: [1125, 445, 1325, 625], postes: [[1200, 493, 1211, 481], [1275, 510, 1287, 495], [1180, 526, 1171, 560], [1257, 545, 1250, 576]] }, // C17–C20
];
export const ILOTS_PLAN = ILOTS;

// Objets réservables : un poste = un code (C01…C20), relié à la ressource Nexudus par son nom.
export const POSTES_PLAN = ILOTS.flatMap((il, i) => il.postes.map(([x, y, fx, fy], k) => ({
  code: "C" + String(i * 4 + k + 1).padStart(2, "0"),
  nom: "Desk C" + String(i * 4 + k + 1).padStart(2, "0"),
  zone: il.zone, ilot: i, x, y, fx, fy,
})));

export const ZONES = {
  fenetre: { nom: "Window side", texte: "Facing the boulevard, the best light on the floor.", equipements: ["Daylight", "150 cm oak desk", "Built-in fibre and sockets", "Day locker"] },
  debout: { nom: "Sit-stand", texte: "Height-adjustable desk, for long days.", equipements: ["Sit-stand desk", "Built-in fibre and sockets", "Day locker"] },
  ecran: { nom: "Dual screen", texte: "Two 27-inch screens, for side-by-side work.", equipements: ["Two 27-inch screens", "USB-C docking station", "Built-in fibre and sockets", "Day locker"] },
  calme: { nom: "Library", texte: "Behind the workshop glass wall. No phone calls here.", equipements: ["Quiet zone", "150 cm oak desk", "Built-in fibre and sockets", "Day locker"] },
};

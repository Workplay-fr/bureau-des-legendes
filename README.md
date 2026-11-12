# Bureau des Légendes — site vitrine

Site vitrine du coworking fictif Bureau des Légendes (34, boulevard Haussmann), relié à Nexudus.

- `index.html` : le site (une page, navigation par ancres, animations, scène 3D).
- `netlify/functions/salles.mjs` : disponibilités réelles des salles de réunion (GET) et réservation dans Nexudus (POST). Le paiement affiché est simulé, aucune donnée bancaire n'est envoyée.
- `netlify/functions/membres.mjs` : adhésion en ligne. Crée la fiche client avec son compte portail, puis le contrat de la formule choisie. Le paiement affiché est simulé.
- `netlify/lib/nexudus.mjs` : appels à l'API Nexudus, heure de Paris, contacts, liste des salles et horaires.
- `netlify/functions/visite.mjs` : reçoit le formulaire « Réserver une visite » et crée le contact puis l'opportunité dans le CRM Nexudus (Sales Pipeline · Demande de visite en ligne).

## Le plateau en 3D (`/plateau`)

Page à part : le 1er étage en 3D, on clique un poste flexible (C01 à C20) pour le réserver.

- `plateau/js/plan.js` : implantation reprise du plan Nexudus (murs, zones, postes). Aucune donnée de disponibilité.
- `plateau/js/scene.js` : décor, mobilier, caméra, survol et sélection (three.js, copié dans `plateau/vendor`).
- `plateau/js/donnees.js` : disponibilités, prix et réservation. Passe par `/api/postes` ; si la fonction ne répond pas (aperçu hors ligne), bascule sur des données simulées, signalées à l'écran.
- `plateau/js/main.js` : interface (date, créneau, filtres, fiche, liste utilisable au clavier).
- `netlify/functions/postes.mjs` : état des 20 postes par créneau (GET) et réservation dans Nexudus (POST). Le serveur revérifie la disponibilité et fixe le prix.

Provisoire : parquet dessiné par le code (en attendant la texture photo), position des fenêtres (absente du plan Nexudus), une seule essence de plante, tarifs des postes (15 € HT la demi-journée, 25 € HT la journée, dans `netlify/lib/nexudus.mjs`). Le paiement est simulé. Crédits des modèles : `plateau/credits.html`.

## Accès protégé

`netlify/edge-functions/garde.js` protège tout le site par un mot de passe (`SITE_PASSWORD`). Sans cookie valide, chaque page affiche l'écran de connexion. `/deconnexion` ferme la session. Le site n'est pas indexé par les moteurs de recherche.

## Variables d'environnement Netlify

| Variable | Rôle |
| --- | --- |
| `SITE_PASSWORD` | mot de passe d'accès au site |
| `NEXUDUS_USER` | e-mail de l'utilisateur API Nexudus dédié |
| `NEXUDUS_PASSWORD` | son mot de passe |
| `NEXUDUS_BUSINESS_ID` | facultatif, 1420978704 par défaut |
| `NEXUDUS_CRM_COLUMN_ID` | facultatif, 1415241903 par défaut |
| `ALLOWED_ORIGIN` | facultatif, domaine autorisé à appeler la fonction |

Chaque push sur `main` redéploie le site.

## Habillage du portail membre

`portail/bdl-portail.js` habille le tableau de bord du portail Nexudus (typo Jost, bandeau photo animé, salutation selon l'heure, grille deux colonnes, apparitions au défilement). Il est chargé par un bloc « Script » du plan de page `personal-dashboard` (éditeur du portail, `/admin/editor/personal-dashboard`). Le dossier `/portail/` est exempté du mot de passe du site. Pour revenir au tableau de bord d'origine : « Supprimer le plan » dans l'éditeur.

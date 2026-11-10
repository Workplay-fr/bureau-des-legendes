# Bureau des Légendes — site vitrine

Site vitrine du coworking fictif Bureau des Légendes (34, boulevard Haussmann), relié à Nexudus.

- `index.html` : le site (une page, navigation par ancres, animations, scène 3D).
- `netlify/functions/salles.mjs` : disponibilités réelles des salles de réunion (GET) et réservation dans Nexudus (POST). Le paiement affiché est simulé, aucune donnée bancaire n'est envoyée.
- `netlify/functions/membres.mjs` : adhésion en ligne. Crée la fiche client avec son compte portail, puis le contrat de la formule choisie. Le paiement affiché est simulé.
- `netlify/lib/nexudus.mjs` : appels à l'API Nexudus, heure de Paris, contacts, liste des salles et horaires.
- `netlify/functions/visite.mjs` : reçoit le formulaire « Réserver une visite » et crée le contact puis l'opportunité dans le CRM Nexudus (Sales Pipeline · Demande de visite en ligne).

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

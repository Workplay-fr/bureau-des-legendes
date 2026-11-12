# Bureau des Légendes — site vitrine

Site vitrine du coworking fictif Bureau des Légendes (312, boulevard Haussmann), relié à Nexudus.

- `index.html` : le site (une page, navigation par ancres, animations, scène 3D).
- `netlify/functions/salles.mjs` : disponibilités réelles des salles de réunion (GET) et réservation dans Nexudus (POST). Le paiement affiché est simulé, aucune donnée bancaire n'est envoyée.
- `netlify/functions/membres.mjs` : adhésion en ligne. Crée la fiche client avec son compte portail, puis le contrat de la formule choisie. Le paiement affiché est simulé.
- `netlify/lib/nexudus.mjs` : appels à l'API Nexudus, heure de Paris, contacts, liste des salles et horaires.
- `netlify/functions/visite.mjs` : reçoit le formulaire « Réserver une visite » et crée le contact puis l'opportunité dans le CRM Nexudus (Sales Pipeline · Demande de visite en ligne).

Le haut de l'accueil montre l'entrée de l'immeuble (`#entree`). Un clic ouvre « l'univers » (`#univers`) : on passe la porte, la maquette de l'immeuble apparaît puis s'ouvre en quatre niveaux (calques dans `img/immeuble/`), chacun avec son offre et son bouton (salle, poste, adhésion, visite). L'accueil affiche le plateau dans la section « Un poste pour aujourd'hui ? » (`#apercu` dans `index.html`) : il lit `/api/postes` pour montrer les postes libres du jour et renvoie vers `/plateau/?jour=…&poste=…`. Sans réponse de Nexudus, il reste une simple image, sans disponibilité inventée.

## Le plateau (`/plateau`)

Page à part : le rendu du 1er étage, dans lequel on zoome et on clique un poste flexible (C01 à C20) pour le réserver.

- `plateau/assets/plateau-2x.webp` : rendu de l'étage, image générée d'après l'implantation Nexudus (agrandie deux fois depuis 1536 × 1024).
- `plateau/js/plan.js` : position de chaque poste sur l'image, placée à la main. Aucune donnée de disponibilité.
- `plateau/js/scene.js` : déplacement, zoom, survol et sélection dans l'image.
- `plateau/js/donnees.js` : disponibilités, prix et réservation. Passe par `/api/postes` ; si la fonction ne répond pas (aperçu hors ligne), bascule sur des données simulées, signalées à l'écran.
- `plateau/js/main.js` : interface (date, créneau, filtres, repères, fiche, liste utilisable au clavier).
- `netlify/functions/postes.mjs` : état des 20 postes par créneau (GET) et réservation dans Nexudus (POST). Le serveur revérifie la disponibilité et fixe le prix.

Mouvement : tracé d'ouverture, légère inclinaison à la souris, rais de soleil et poussières, mise au point sur le poste choisi, sceau de confirmation. La lumière suit le créneau : un rendu du matin et un rendu de fin de journée remplacent l'image en fondu (`IMAGE.ambiances` dans `plan.js`).

Provisoire : tarifs des postes (15 € HT la demi-journée, 25 € HT la journée, dans `netlify/lib/nexudus.mjs`). Le paiement est simulé. Une première version en 3D temps réel (three.js) reste dans l'historique git.

## Version anglaise (`/en/`, `/plateau/en/`)

Générée à partir des pages françaises par `python3 outils/en.py`, à relancer après chaque modification de `index.html` ou des fichiers de `plateau/`. Le script contient toutes les traductions et s'arrête en listant le texte concerné si une phrase française a changé ou n'est pas traduite : on ajoute la traduction dans le script et on relance. Ne pas modifier `en/` ni `plateau/en/` à la main.

Les pages anglaises envoient `lang=en` aux fonctions : leurs messages d'erreur reviennent en anglais (`bilingue()` dans `netlify/lib/nexudus.mjs`). L'écran d'accès passe en anglais pour les adresses en `/en/`. Les notes enregistrées dans Nexudus restent en français.

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

## Nexudus comme seule source des données

Le site ne garde en dur que des identifiants (quelle ressource, quel produit, quelle formule apparaît où) et des valeurs de secours.
Tout le reste est relu dans Nexudus par `netlify/lib/catalogue.mjs`, au plus toutes les 60 secondes, et servi aux pages par `/api/catalogue` :

| Sur le site | Dans Nexudus |
|---|---|
| Horaires d'ouverture, créneaux matin / après-midi / journée | Fiche du lieu, horaires d'ouverture |
| Adresse (numéro de rue), téléphone, e-mail | Fiche du lieu |
| Salles : nom, capacité, équipements, prix à l'heure | Ressource (nom, capacité, cases d'équipement) et tarif public de son type de ressource |
| Postes : nom, catégorie sur le plan, description, équipements | Ressource (cases Bureau assis-debout, Double écran, Zone silencieuse, Lumière naturelle, description) |
| Postes : prix demi-journée et journée | Tarifs « Poste flexible · demi-journée » (1415437351) et « Poste flexible · journée » (1415437449) |
| Services d'une réservation : nom, prix, description | Produits |
| Formules : nom, prix, accroche | Formules (tariffs) |
| Disponibilités | Réservations |

Les fonctions serveur (`/api/salles`, `/api/postes`, `/api/membres`) recalculent les montants avec ces mêmes valeurs.
En anglais, les chiffres et les équipements suivent Nexudus ; les noms et descriptions gardent leur traduction (`outils/en.py`).
Si Nexudus ne répond pas, le site affiche les valeurs de secours écrites dans le code.

### Réservations et adhésions
- Une réservation créée depuis le site porte son montant dans Nexudus (`OverridePrice`, calculé avec les tarifs lus dans Nexudus) : elle se facture d'un clic depuis Nexudus (« Invoice this booking »).
- La domiciliation n'est pas contractualisable par l'API pour ce lieu (les « virtual offices » ne font pas partie de son abonnement Nexudus) : `/api/membres` enregistre alors une demande dans le pipeline commercial.
- Une adresse e-mail refusée par Nexudus (domaine inexistant) renvoie un message clair au visiteur.
- Pass journée : `/api/pass` crée dans Nexudus un pass par journée achetée (time passes « Pass journée » 1415370171 et « Pass journée · carnet de 10 » 1415370271, dont le site lit les prix).
- Invités d'une réservation de salle : transmis à Nexudus comme visiteurs de la réservation (`BookingVisitors`).
- Agenda et disponibilité des bureaux : `/api/catalogue` renvoie les trois prochains événements et l'occupation des bureaux privés et postes attitrés du plan d'étage.

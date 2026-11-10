# Bureau des Légendes — site vitrine

Site vitrine du coworking fictif Bureau des Légendes (34, boulevard Haussmann), relié à Nexudus.

- `index.html` : le site (une page, navigation par ancres, animations, scène 3D).
- `netlify/functions/salles.mjs` : disponibilités réelles des salles de réunion (GET) et réservation dans Nexudus (POST). Le paiement affiché est simulé, aucune donnée bancaire n'est envoyée.
- `netlify/lib/nexudus.mjs` : appels à l'API Nexudus, heure de Paris, contacts, liste des salles et horaires.
- `netlify/functions/visite.mjs` : reçoit le formulaire « Réserver une visite » et crée le contact puis l'opportunité dans le CRM Nexudus (Sales Pipeline · Demande de visite en ligne).

## Variables d'environnement Netlify

| Variable | Rôle |
| --- | --- |
| `NEXUDUS_USER` | e-mail de l'utilisateur API Nexudus dédié |
| `NEXUDUS_PASSWORD` | son mot de passe |
| `NEXUDUS_BUSINESS_ID` | facultatif, 1420978704 par défaut |
| `NEXUDUS_CRM_COLUMN_ID` | facultatif, 1415241903 par défaut |
| `ALLOWED_ORIGIN` | facultatif, domaine autorisé à appeler la fonction |

Chaque push sur `main` redéploie le site.

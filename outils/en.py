#!/usr/bin/env python3
"""Génère la version anglaise du site (en/index.html) à partir de index.html.

À relancer après chaque modification de index.html :  python3 outils/en.py
Chaque texte français listé ici doit exister dans la page : sinon le script s'arrête et dit lequel,
pour qu'aucune phrase ne reste en français sans qu'on le voie.
"""
import re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
src = (RACINE / "index.html").read_text()

# ---------------------------------------------------------------- 1. morceaux de HTML (avec exposants)
SNIP = [
    ("Paris IX<sup>e</sup>", "Paris 9<sup>th</sup>"),
    ("Vingt postes flexibles au 1<sup>er</sup> étage, seize postes attitrés au 2<sup>e</sup>. Bureaux en chêne, lampes en laiton, prises à chaque place et lumière du boulevard.",
     "Twenty flexible desks on the 1<sup>st</sup> floor, sixteen dedicated desks on the 2<sup>nd</sup>. Oak desks, brass lamps, a socket at every seat and light from the boulevard."),
    ("Coworking · 1<sup>er</sup> étage", "Coworking · 1<sup>st</sup> floor"),
    ("Plateau du 1<sup>er</sup> étage", "1<sup>st</sup> floor"),
    ("Plateau du 2<sup>e</sup> étage", "2<sup>nd</sup> floor"),
    ("5 à 6 personnes · 1<sup>er</sup> étage, côté boulevard", "5 to 6 people · 1<sup>st</sup> floor, boulevard side"),
    ("3 à 4 personnes · 2<sup>e</sup> étage, sur cour", "3 to 4 people · 2<sup>nd</sup> floor, courtyard side"),
    ("15 personnes · 1<sup>er</sup> étage", "15 people · 1<sup>st</sup> floor"),
    ("15 personnes · 2<sup>e</sup> étage", "15 people · 2<sup>nd</sup> floor"),
    ("15 personnes · 3<sup>e</sup> étage", "15 people · 3<sup>rd</sup> floor"),
    ("1 personne · 2<sup>e</sup> étage", "1 person · 2<sup>nd</sup> floor"),
    ("1 personne · 3<sup>e</sup> étage", "1 person · 3<sup>rd</sup> floor"),
    ("Poste flexible au 1<sup>er</sup> étage", "Flexible desk on the 1<sup>st</sup> floor"),
]

# ---------------------------------------------------------------- 2. textes de la page (nœuds texte exacts)
TEXT = {
    "Espaces": "Spaces", "Formules": "Memberships", "Événements": "Events", "Contact": "Contact",
    "Espace membre": "Member area", "Réserver une visite": "Book a visit", "Menu": "Menu", "Accueil": "Home",
    "Réserver un poste": "Book a desk", "312, boulevard Haussmann": "312, boulevard Haussmann",
    "Coworking et bureaux": "Coworking and offices",
    "Une adresse pour écrire sa légende.": "An address to write your legend.",
    "Coworking, bureaux privés et salles de réunion, dans un immeuble haussmannien.": "Coworking, private offices and meeting rooms in a Haussmann building.",
    "Réserver une salle": "Book a room",
    "Dès 35 € HT de l'heure · créneaux en temps réel": "From €35 excl. VAT per hour · live availability",
    "Visiter le lieu": "Visit the space", "30 minutes, café compris ;)": "30 minutes, coffee included ;)",
    "Devenir membre": "Become a member", "Dès 90 € HT par mois · inscription en 2 minutes": "From €90 excl. VAT per month · sign up in 2 minutes",
    "Légendes": "Legends", "Powered by": "Powered by",
    "Poussez la porte.": "Step inside.",
    "Quatre niveaux à parcourir en maquette : salles, coworking, bureaux privés.": "Four floors to explore as a scale model: rooms, coworking, private offices.",
    "Explorer l'immeuble": "Explore the building",
    "postes": "desks", "flexibles, à choisir sur le plan": "flexible, picked on the floor plan",
    "salles": "rooms", "de réunion, jusqu'à 15 personnes": "meeting rooms, up to 15 people",
    "de verrière pour vos événements": "under glass for your events",
    "espaces": "spaces", "réservables en ligne": "bookable online",
    "Salles de réunion": "Meeting rooms", "Une salle pour demain matin ?": "A room for tomorrow morning?",
    "Quatre salles, jusqu'à 15 personnes. Créneaux en temps réel.": "Four rooms, up to 15 people. Live availability.",
    "Réserver une salle de réunion": "Book a meeting room",
    "Un poste pour aujourd'hui ?": "A desk for today?",
    "Vingt postes flexibles. Choisissez le vôtre sur le plan.": "Twenty flexible desks. Pick yours on the floor plan.",
    "Choisir mon poste": "Choose my desk", "Le plateau": "The floor", "20 postes flexibles": "20 flexible desks",
    "Libre": "Free", "Occupé": "Taken",
    "Les formules": "Memberships", "Quatre façons d'en être.": "Four ways to belong.",
    "Tarifs mensuels. Le détail de chaque formule est sur la page dédiée.": "Monthly prices. Each membership is detailed on its own page.",
    "Nomade": "Nomad", "Poste flexible, à choisir chaque jour": "A flexible desk, chosen each day",
    "par mois": "per month", "Choisir": "Choose", "Résident": "Resident", "Votre poste attitré": "Your own dedicated desk",
    "Bureau privé": "Private office", "Un bureau fermé pour votre équipe": "A closed office for your team",
    "Domiciliation": "Business address", "Votre siège au 312 boulevard Haussmann": "Your registered office at 312 boulevard Haussmann",
    "Les espaces": "The spaces", "Douze pièces, douze missions.": "Twelve rooms, twelve missions.",
    "Du poste de coworking à la verrière de 120&nbsp;m², tous nos espaces se réservent en ligne depuis l'espace membre.": "From a coworking desk to the 120&nbsp;m² glass hall, every space can be booked online from the member area.",
    "Coworking": "Coworking", "Les plateaux": "The floors",
    "20 postes flexibles ·": "20 flexible desks ·", "voir les postes libres": "see free desks", "16 postes attitrés": "16 dedicated desks",
    "Bureaux privés": "Private offices", "Vos quartiers": "Your own quarters",
    "Deux bureaux fermés, à la journée, au mois ou à l'année. Mobilier sur mesure, rangements sécurisés, fibre dédiée, et votre plaque à la porte.":
        "Two closed offices, by the day, the month or the year. Bespoke furniture, secure storage, dedicated fibre and your name plate on the door.",
    "Bureau George Smiley": "George Smiley office", "Bureau Mata Hari": "Mata Hari office", "Visiter un bureau": "Visit an office",
    "Les salles de briefing": "The briefing rooms",
    "Quatre salles pour vos comités, vos visioconférences et vos présentations. Grand écran, vidéoprojecteur, connexion très haut débit et lumière naturelle.":
        "Four rooms for your board meetings, video calls and presentations. Large screen, projector, very fast connection and daylight.",
    "Salle des Légendes": "Legends Room", "Salle Jason Bourne": "Jason Bourne Room", "Salle Ethan Hunt": "Ethan Hunt Room", "Salle James Bond": "James Bond Room",
    "Cabines": "Booths", "Ligne sécurisée": "Secure line",
    "Deux cabines capitonnées et insonorisées pour un appel au calme ou une visio en tête-à-tête. Assise confortable, tablette, prise et USB-C.":
        "Two padded, soundproofed booths for a quiet call or a one-to-one video meeting. Comfortable seat, shelf, socket and USB-C.",
    "Cabine Enigma": "Enigma booth", "Cabine Morse": "Morse booth", "Réserver une cabine": "Book a booth",
    "Événementiel": "Events", "La Verrière": "La Verrière",
    "Une verrière d'atelier de 120&nbsp;m², parquet ancien et grandes plantes, au rez-de-chaussée. Elle se configure en conférence, en cocktail ou en ateliers.":
        "A 120&nbsp;m² workshop glass hall on the ground floor, with old parquet and tall plants. It can be set up for a conference, a reception or workshops.",
    "En conférence": "Conference", "60 personnes assises": "60 seated", "En cocktail": "Reception", "90 personnes debout": "90 standing",
    "Découvrir la Verrière": "Discover La Verrière",
    "Choisissez votre couverture.": "Choose your cover.",
    "Quatre formules mensuelles. Vous souscrivez en ligne et gérez tout depuis votre espace membre.": "Four monthly memberships. Sign up online and manage everything from your member area.",
    "Pour venir quand vous voulez": "Come whenever you like",
    "Fibre très haut débit": "Very fast fibre", "Accès aux cabines Enigma et Morse": "Access to the Enigma and Morse booths",
    "Salles de réunion à la réservation": "Meeting rooms on booking", "Choisir Nomade": "Choose Nomad",
    "Pour avoir votre place à vous": "A place of your own", "Poste attitré sur un plateau": "A dedicated desk on a floor",
    "Casier sécurisé": "Secure locker", "Choisir Résident": "Choose Resident",
    "Pour une équipe de 3 à 6 personnes": "For a team of 3 to 6", "Bureau fermé George Smiley ou Mata Hari": "George Smiley or Mata Hari closed office",
    "Ligne fibre dédiée": "Dedicated fibre line", "Rangements sécurisés": "Secure storage", "Votre plaque à la porte": "Your name plate on the door",
    "Choisir Bureau privé": "Choose Private office",
    "Pour installer votre siège à Paris": "To set up your head office in Paris", "Adresse au 312 boulevard Haussmann": "Address at 312 boulevard Haussmann",
    "Réception de votre courrier": "Mail handling", "Gestion depuis l'espace membre": "Managed from the member area",
    "Choisir Domiciliation": "Choose Business address",
    "Une question sur une formule ?": "A question about a membership?", "Écrivez-nous": "Write to us", "ou passez nous voir.": "or drop by.",
    "Questions fréquentes": "FAQ", "Avant de signer.": "Before you sign.",
    "Puis-je visiter avant de choisir ?": "Can I visit before choosing?",
    "Oui. Réservez un créneau de visite en ligne, nous vous faisons découvrir les trois étages et la Verrière.": "Yes. Book a visit online and we will show you the three floors and La Verrière.",
    "Comment réserver une salle de réunion ?": "How do I book a meeting room?",
    "Depuis votre espace membre. Vous voyez les disponibilités en temps réel, choisissez votre créneau et recevez la confirmation par e-mail.":
        "From your member area. You see live availability, choose your slot and receive the confirmation by email.",
    "Où retrouver mes factures ?": "Where can I find my invoices?",
    "Dans votre espace membre, avec votre contrat et l'historique de vos réservations.": "In your member area, with your contract and your booking history.",
    "Puis-je changer de formule ?": "Can I change membership?",
    "Oui. Parlez-en à l'équipe sur place ou écrivez-nous, nous ajustons votre formule à votre rythme.": "Yes. Talk to the team on site or write to us, and we will adjust your membership to suit you.",
    "Sous la verrière, de jour comme de nuit.": "Under the glass roof, day and night.",
    "Une conférence le matin, un cocktail le soir. La Verrière se privatise, et la maison a aussi son propre agenda.": "A conference in the morning, a reception in the evening. La Verrière can be hired privately, and the house has its own programme too.",
    "De jour": "By day", "De nuit": "By night", "assis": "seated", "Conférence": "Conference",
    "Scène, fauteuils d'intervenants et rangées de chaises face à la cheminée.": "A stage, speakers' armchairs and rows of chairs facing the fireplace.",
    "debout": "standing", "Cocktail": "Reception",
    "Mange-debout, lumières tamisées et grandes plantes sous le ciel de Paris.": "High tables, soft lighting and tall plants under the Paris sky.",
    "Ateliers": "Workshops", "Sonorisation, grand écran et vidéoprojection. La salle se reconfigure selon votre format.": "Sound system, large screen and projection. The room adapts to your format.",
    "Privatiser la Verrière": "Hire La Verrière", "Voir les disponibilités": "See availability",
    "L'agenda de la maison": "The house programme", "Des rendez-vous réservés aux initiés.": "Gatherings for those in the know.",
    "Les dates et les inscriptions sont dans l'agenda en ligne.": "Dates and sign-ups are in the online calendar.",
    "Petits-déjeuners": "Breakfasts", "Croissants, café et nouvelles têtes. Le moment le plus simple pour rencontrer les autres membres.": "Croissants, coffee and new faces. The easiest way to meet other members.",
    "Masterclass": "Masterclasses", "Un invité, un sujet, une heure. En petit comité, dans les fauteuils en cuir de la salle de projection.": "One guest, one topic, one hour. A small group, in the leather armchairs of the screening room.",
    "Dégustations": "Tastings", "Vins, fromages et planches à partager, en fin de journée, quand le plateau se transforme en salon.": "Wine, cheese and sharing boards at the end of the day, when the floor turns into a lounge.",
    "Voir l'agenda": "See the calendar", "Prenons rendez-vous.": "Let's meet.",
    "Le plus simple est de venir voir. Sinon, un appel ou un message, et nous revenons vers vous dans la journée.": "The simplest way is to come and see. Otherwise, call or write, and we will get back to you the same day.",
    "Coordonnées": "Details", "Adresse": "Address", "75009 Paris": "75009 Paris", "Copier": "Copy", "Téléphone": "Phone", "E-mail": "Email",
    "Votre mission, si vous l'acceptez": "Your mission, should you choose to accept it",
    "Venez voir le lieu de vos yeux.": "Come and see the place for yourself.",
    "Coworking et bureaux privés, boulevard Haussmann.": "Coworking and private offices, boulevard Haussmann.",
    "Le lieu": "The place", "Membres": "Members", "Agenda": "Calendar",
    "312, boulevard Haussmann, 75009 Paris": "312, boulevard Haussmann, 75009 Paris",
    "Lieu de démonstration · réservations et espace membre propulsés par Nexudus": "Demo venue · bookings and member area powered by Nexudus",
    "Quatre niveaux, une adresse.": "Four floors, one address.",
    "Choisissez un niveau pour voir ce qu'il propose, puis réservez en ligne.": "Choose a floor to see what it offers, then book online.",
    "· du lundi au samedi": "· Monday to Saturday",
    "Venez voir le lieu.": "Come and see the place.", "Votre jour": "Your day", "Votre créneau": "Your time",
    "Matin · 10 h": "Morning · 10:00", "Après-midi · 14 h 30": "Afternoon · 14:30", "Fin de journée · 18 h": "Evening · 18:00",
    "Ce qui vous intéresse": "What interests you", "Je ne sais pas encore": "Not sure yet",
    "Visite de 30 minutes, café compris ;)": "A 30-minute visit, coffee included ;)", "Continuer": "Continue",
    "Prénom et nom": "First and last name", "Société": "Company", "Taille de l'équipe": "Team size",
    "Seul·e": "Just me", "2 à 5 personnes": "2 to 5 people", "6 personnes et plus": "6 people or more",
    "Un mot pour l'équipe (facultatif)": "A note for the team (optional)", "Site web": "Website",
    "J'accepte que le Bureau des Légendes me recontacte au sujet de cette visite.": "I agree that Bureau des Légendes may contact me about this visit.",
    "← Retour": "← Back", "Envoyer ma demande": "Send my request", "Merci": "Thank you", "C'est noté.": "All set.",
    "Votre demande de visite est bien enregistrée. Nous vous envoyons un e-mail à": "Your visit request has been recorded. We will email you at",
    "pour confirmer votre créneau, en général dans la journée.": "to confirm your time, usually the same day.",
    "Fermer": "Close", "Votre panier": "Your basket", "Total TTC": "Total incl. VAT",
    "Réserver une salle · 1 sur 5": "Book a room · 1 of 5", "Choisissez votre salle.": "Choose your room.",
    "Tarifs à l'heure, hors taxes.": "Hourly prices, excluding VAT.", "Voir les créneaux": "See time slots",
    "Jour": "Day", "Durée": "Duration", "1 heure": "1 hour", "2 heures": "2 hours", "3 heures": "3 hours", "Demi-journée · 4 h": "Half day · 4 h",
    "Heure d'arrivée": "Arrival time", "Déjà réservé": "Already booked", "Choisissez une heure.": "Choose a time.",
    "← Salle": "← Room", "Choisir des services pour votre réservation": "Add services to your booking",
    "Services pour votre réunion": "Services for your meeting", "Pour": "For", "personnes": "people",
    "Facultatif : tout est préparé en salle avant votre arrivée et ajouté à votre réservation dans Nexudus.": "Optional: everything is set up in the room before you arrive and added to your booking in Nexudus.",
    "← Créneau": "← Time", "Continuer sans service": "Continue without services",
    "Prénom": "First name", "Nom": "Last name", "Entreprise": "Company", "Participants": "Attendees",
    "Objet de la réunion (facultatif)": "Meeting subject (optional)",
    "J'accepte les conditions de réservation : annulation gratuite jusqu'à 24 h avant le créneau.": "I accept the booking terms: free cancellation up to 24 hours before the slot.",
    "← Services": "← Services", "Passer au paiement": "Go to payment",
    "Paiement de démonstration :": "Demo payment:", "aucune carte n'est débitée, la réservation est bien enregistrée.": "no card is charged, and the booking is recorded.",
    "Numéro de carte": "Card number", "Expiration": "Expiry", "CVC": "CVC", "Titulaire": "Cardholder",
    "← Coordonnées": "← Details", "Payer": "Pay",
    "Votre salle est bloquée à votre nom. Nous vous envoyons un e-mail à": "The room is held in your name. We will email you at",
    "pour confirmer la réservation, puis l'équipe vous accueille au 312, boulevard Haussmann.": "to confirm the booking, and the team will welcome you at 312, boulevard Haussmann.",
    "Choisissez votre formule.": "Choose your membership.",
    "Mensuel, sans frais d'adhésion. Vous pourrez changer de formule à tout moment depuis votre espace membre.": "Monthly, no joining fee. You can change membership at any time from your member area.",
    "Quand souhaitez-vous commencer ?": "When would you like to start?",
    "Le premier mois est calculé au prorata à partir de cette date.": "The first month is prorated from this date.",
    "Combien de postes dans votre bureau ?": "How many desks in your office?",
    "Nos bureaux privés accueillent jusqu'à 6 personnes. Le tarif s'entend par poste.": "Our private offices seat up to 6 people. The price is per desk.",
    "Comment vous appelez-vous ?": "What is your name?", "OK": "OK", "appuyez sur": "press", "Entrée ↵": "Enter ↵",
    "Ravi de vous rencontrer,": "Nice to meet you,", ". Pour quelle entreprise ?": ". Which company?",
    "Facultatif : laissez vide si vous venez à titre personnel.": "Optional: leave blank if you are joining as an individual.",
    "Où pouvons-nous vous écrire ?": "Where can we write to you?",
    "Vos accès à l'espace membre seront rattachés à cette adresse.": "Your member area access will be linked to this address.",
    "Dernière étape : le paiement.": "Last step: payment.", "Paiement de démonstration.": "Demo payment.",
    "Aucune carte n'est débitée et aucune donnée bancaire n'est demandée : les champs ci-dessous sont des valeurs de test. L'adhésion, elle, est bien enregistrée.":
        "No card is charged and no bank details are requested: the fields below are test values. The membership itself is recorded.",
    "Premier mois TTC": "First month incl. VAT",
    "J'accepte les conditions d'adhésion : formule mensuelle, résiliable avec un préavis de": "I accept the membership terms: monthly plan, cancellable with a notice of",
    "jours.": "days.", "Bienvenue au Bureau des Légendes,": "Welcome to Bureau des Légendes,",
    "Votre adhésion est enregistrée. Nous vous attendons le": "Your membership is recorded. We look forward to seeing you on",
    "pour vous remettre votre badge.": "to hand over your badge.",
    "Accéder à l'espace membre": "Go to the member area", "Retour au site": "Back to the site",
}

# ---------------------------------------------------------------- 3. attributs (alt, aria-label, placeholder, title)
ATTR = {
    "Bureau des Légendes, accueil": "Bureau des Légendes, home", "Navigation principale": "Main navigation", "Accès rapides": "Quick links",
    "Explorer l'immeuble : pousser la porte du 312, boulevard Haussmann": "Explore the building: step through the door of 312, boulevard Haussmann",
    "L'entrée du Bureau des Légendes au crépuscule : porte cochère ouverte sur un intérieur éclairé, plaque en laiton, façade en pierre": "The entrance of Bureau des Légendes at dusk: open carriage door onto a lit interior, brass plate, stone façade",
    "Le lieu en chiffres": "The place in figures",
    "Le plateau du 1er étage : voir les postes libres et en réserver un": "The 1st-floor coworking space: see free desks and book one",
    "Maquette du plateau de coworking : cinq îlots de quatre postes, une bibliothèque vitrée et un lounge": "Scale model of the coworking floor: five clusters of four desks, a glazed library and a lounge",
    "Plateau de coworking avec longue table en noyer et hautes fenêtres sur le boulevard": "Coworking floor with a long walnut table and tall windows onto the boulevard",
    "Bureau privé avec cheminée de marbre, grand miroir doré et casiers en bois": "Private office with a marble fireplace, large gilt mirror and wooden lockers",
    "Salle de projection avec fauteuils en cuir, grand écran et bibliothèques éclairées": "Screening room with leather armchairs, large screen and lit bookcases",
    "Deux cabines téléphoniques capitonnées bleu nuit dans un couloir haussmannien": "Two padded midnight-blue phone booths in a Haussmann corridor",
    "La Verrière installée en conférence, rangées de chaises sous la grande verrière": "La Verrière set up for a conference, rows of chairs under the glass roof",
    "La Verrière de jour, installée en conférence": "La Verrière by day, set up for a conference",
    "La Verrière de nuit, guirlandes lumineuses, bougies et mange-debout": "La Verrière by night, string lights, candles and high tables",
    "Table de petit-déjeuner avec croissants, jus d'orange et café": "Breakfast table with croissants, orange juice and coffee",
    "Salle de projection aux fauteuils en cuir": "Screening room with leather armchairs",
    "Table de dégustation avec vins, charcuteries et fromages": "Tasting table with wine, charcuterie and cheese",
    "Bureau en cuir avec enveloppe, tampon en laiton et stylo": "Leather desk with an envelope, brass stamp and pen",
    "Refermer et revenir au site": "Close and return to the site",
    "Maquette de l'immeuble haussmannien de quatre niveaux, fenêtres éclairées": "Scale model of the four-storey Haussmann building, windows lit",
    "Les quatre niveaux de l'immeuble": "The four floors of the building",
    "3e étage : un étage pour votre équipe": "3rd floor: a floor for your team", "2e étage : résidents et bureaux privés": "2nd floor: residents and private offices",
    "1er étage : le plateau de coworking": "1st floor: the coworking floor", "Rez-de-chaussée : salles de réunion et Verrière": "Ground floor: meeting rooms and La Verrière",
    "Fermer": "Close", "La salle et ses services": "The room and its services", "Photo précédente": "Previous photo", "Photo suivante": "Next photo",
    "Une personne de moins": "One person fewer", "Une personne de plus": "One more person", "Devenir membre": "Become a member",
    "Prénom": "First name", "Nom": "Last name", "Nom de votre entreprise": "Your company name", "Entreprise": "Company",
    "vous@entreprise.fr": "you@company.com", "E-mail": "Email", "Téléphone (facultatif)": "Phone (optional)", "Téléphone": "Phone",
    "Question précédente": "Previous question", "Question suivante": "Next question", "Fermer la liste": "Close the list",
}

# ---------------------------------------------------------------- 4. script de la page (morceaux exacts, guillemets compris)
JS = [
    ('niveau:"Rez-de-chaussée", titre:"Salles de réunion et Verrière", detail:"Quatre salles jusqu\'à 15 personnes, et 120 m² sous verrière. Dès 35 € HT de l\'heure.", cta:"Réserver une salle"',
     'niveau:"Ground floor", titre:"Meeting rooms and La Verrière", detail:"Four rooms for up to 15 people, and 120 m² under glass. From €35 excl. VAT per hour.", cta:"Book a room"'),
    ('niveau:"1er étage", titre:"Le plateau de coworking", detail:"Vingt postes flexibles, à choisir sur le plan. Dès 15 € HT la demi-journée.", cta:"Réserver un poste"',
     'niveau:"1st floor", titre:"The coworking floor", detail:"Twenty flexible desks, picked on the floor plan. From €15 excl. VAT per half day.", cta:"Book a desk"'),
    ('niveau:"2e étage", titre:"Résidents et bureaux privés", detail:"Seize postes attitrés et trois bureaux fermés, avec cheminée et moulures. Dès 490 € HT par mois.", cta:"Devenir membre"',
     'niveau:"2nd floor", titre:"Residents and private offices", detail:"Sixteen dedicated desks and three closed offices, with fireplaces and mouldings. From €490 excl. VAT per month.", cta:"Become a member"'),
    ('niveau:"3e étage", titre:"Un étage pour votre équipe", detail:"Un plateau privatisé : vos postes, votre bureau de direction, votre salle de réunion.", cta:"Réserver une visite"',
     'niveau:"3rd floor", titre:"A floor for your team", detail:"A private floor: your desks, your executive office, your meeting room.", cta:"Book a visit"'),
    ('accueil:"Bureau des Légendes", espaces:"Espaces", formules:"Formules", evenements:"Événements", contact:"Contact"', 'accueil:"Bureau des Légendes", espaces:"Spaces", formules:"Memberships", evenements:"Events", contact:"Contact"'),
    ('"Fermer"', '"Close"'), ('"Copié"', '"Copied"'), ('"Copier"', '"Copy"'),
    ('["dim.","lun.","mar.","mer.","jeu.","ven.","sam."]', '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]'),
    ('["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."]', '["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]'),
    ('"auj."', '"today"'),
    ('"fr-FR"', '"en-GB"'),
    ('.replace(",00","")', '.replace(".00","")'),
    ('const hTxt = h => h + " h";', 'const hTxt = h => h + ":00";'),
    ('+ " à " + creneau.replace(":", " h ").replace(" h 00"," h")', '+ " at " + creneau'),
    ('Paris IX<sup>e</sup> · du lundi au samedi', 'Paris 9<sup>th</sup> · Monday to Saturday'),
    ('"Indiquez votre nom."', '"Please enter your name."'), ('"Indiquez votre prénom."', '"Please enter your first name."'),
    ('"Cette adresse e-mail n\'est pas valide."', '"This email address is not valid."'), ('"Ce numéro paraît incomplet."', '"This number looks incomplete."'),
    ('"Cochez la case pour que nous puissions vous recontacter."', '"Tick the box so that we can contact you."'),
    ('"Refus de Nexudus"', '"Rejected by Nexudus"'),
    ('"Nexudus n\'a pas renvoyé l\'identifiant du contact."', '"Nexudus did not return the contact ID."'),
    ('["Visite", ', '["Visit", '), ('["Intérêt", ', '["Interest", '),
    ('", avec une nouvelle fiche contact" : ", sur la fiche contact existante"', '", with a new contact record" : ", on the existing contact record"'),
    ('Ajoutée au CRM Nexudus : <b>Sales Pipeline · Demande de visite en ligne</b>', 'Added to the Nexudus CRM: <b>Sales Pipeline · Online visit request</b>'),
    ('["C\'est", "noté."]', '["All", "set."]'),
    ('<b>À très vite</b>Sous la verrière, au 312, boulevard Haussmann', '<b>See you soon</b>Under the glass roof, at 312, boulevard Haussmann'),
    ('"La demande n\'a pas pu être envoyée."', '"The request could not be sent."'),
    ('Ce formulaire de démonstration enregistre les demandes dans Nexudus depuis un compte relié au connecteur Nexudus. Vous pouvez aussi <a href="${PORTAIL_VISITE}" target="_blank" rel="noopener">demander votre visite sur le portail</a>.',
     'This demo form records requests in Nexudus from an account linked to the Nexudus connector. You can also <a href="${PORTAIL_VISITE}" target="_blank" rel="noopener">request your visit on the portal</a>.'),
    ('Envoi en cours', 'Sending'), ('"Enregistrement dans Nexudus…"', '"Saving in Nexudus…"'),
    ('"La connexion à Nexudus a expiré. Reconnectez Nexudus dans Réglages → Connecteurs de claude.ai, puis renvoyez la demande."', '"The Nexudus connection has expired. Reconnect Nexudus in Settings → Connectors on claude.ai, then send the request again."'),
    ('"Nexudus demande votre accord pour cette page. Cliquez à nouveau sur « Envoyer ma demande » et autorisez l\'accès."', '"Nexudus needs your permission for this page. Click “Send my request” again and allow access."'),
    ('"Nexudus a refusé la demande : "', '"Nexudus rejected the request: "'),
    ('"La réponse de Nexudus n\'est pas arrivée. La demande a peut-être été enregistrée : vérifiez le CRM avant de renvoyer."', '"No response from Nexudus. The request may have been recorded: check the CRM before sending again."'),
    ('"Envoyer ma demande"', '"Send my request"'),
    ('nom:"Salle des Légendes"', 'nom:"Legends Room"'), ('nom:"Salle Jason Bourne"', 'nom:"Jason Bourne Room"'), ('nom:"Salle Ethan Hunt"', 'nom:"Ethan Hunt Room"'), ('nom:"Salle James Bond"', 'nom:"James Bond Room"'),
    ('"1er étage"', '"1st floor"'), ('"2e étage"', '"2nd floor"'), ('"3e étage"', '"3rd floor"'),
    ('"Grand écran, visio"', '"Large screen, video"'), ('"Écran, visio"', '"Screen, video"'),
    ('${s.places} personnes</span>', '${s.places} people</span>'), ('<span>À l\'heure</span>', '<span>Per hour</span>'),
    ('${eur(s.prix)} HT</b>', '${eur(s.prix)} excl. VAT</b>'),
    ('${s.places} pers. · ${eur(s.prix)} HT / h', '${s.places} people · ${eur(s.prix)} excl. VAT / h'),
    ('${i?"personnes":"personne"}', '${i?"people":"person"}'),
    ('tag:"Inclus"', 'tag:"Included"'), ('tag:"En option"', 'tag:"Optional"'),
    ('"Tout est prêt à votre arrivée"', '"Everything ready when you arrive"'),
    ('"Écran, caméra et micro de salle, Wi-Fi fibre, paperboard. Vous branchez, vous commencez."', '"Screen, room camera and microphone, fibre Wi-Fi, flip chart. Plug in and start."'),
    ('"Petit-déjeuner d\'accueil"', '"Welcome breakfast"'),
    ('"Café, jus pressés et viennoiseries servis dans la salle · 12 € HT par personne."', '"Coffee, fresh juice and pastries served in the room · €12 excl. VAT per person."'),
    ('"Accueil de vos invités"', '"Guest welcome"'), ('"Vos participants sont annoncés à l\'entrée et accompagnés jusqu\'à la salle."', '"Your attendees are announced at reception and shown to the room."'),
    ('"Apéritif de fin de réunion"', '"After-meeting drinks"'),
    ('"Vins et planches à partager, dans la salle ou au salon · à partir de 18 € HT par personne."', '"Wine and sharing boards, in the room or the lounge · from €18 excl. VAT per person."'),
    ('tag:"Votre salle"', 'tag:"Your room"'), ('${s.etage} · jusqu\'à ${s.places} personnes · ${s.eq} · ${eur(s.prix)} HT / h', '${s.etage} · up to ${s.places} people · ${s.eq} · ${eur(s.prix)} excl. VAT / h'),
    ('aria-label="${k+1} sur ${slides.length}"', 'aria-label="${k+1} of ${slides.length}"'), ('aria-label="Voir : ${esc(x.titre)}"', 'aria-label="View: ${esc(x.titre)}"'),
    ('1:"Choisissez votre salle.", 2:"Choisissez votre créneau.", 3:"Vos services.", 4:"Vos coordonnées.", 5:"Paiement."', '1:"Choose your room.", 2:"Choose your time.", 3:"Your services.", 4:"Your details.", 5:"Payment."'),
    ('`Réserver une salle · ${n} sur 5`', '`Book a room · ${n} of 5`'),
    ('"Disponibilités indisponibles."', '"Availability unavailable."'), ('"Disponibilités indisponibles pour le moment."', '"Availability is unavailable at the moment."'),
    ('"Déjà réservé" : passe ? "Créneau passé"', '"Already booked" : passe ? "Past slot"'),
    ('Plus aucun créneau libre ce jour-là pour cette durée. Essayez un autre jour ou une durée plus courte.', 'No free slot left that day for this duration. Try another day or a shorter duration.'),
    ('nom:"Petit-déjeuner"', 'nom:"Breakfast"'), ('"Viennoiseries, jus pressés, boissons chaudes"', '"Pastries, fresh juice, hot drinks"'),
    ('nom:"Pause gourmande"', 'nom:"Afternoon treats"'), ('"Pâtisseries maison, fruits, cafés et thés"', '"Home-made pastries, fruit, coffee and tea"'),
    ('nom:"Plateau repas"', 'nom:"Lunch tray"'), ('"Entrée, plat, dessert et eau, signé Lenôtre"', '"Starter, main, dessert and water, by Lenôtre"'),
    ('nom:"Plateau boissons"', 'nom:"Drinks tray"'), ('"Cafés, thés, eaux et jus dressés en salle"', '"Coffee, tea, water and juice laid out in the room"'),
    ('nom:"Kit visioconférence"', 'nom:"Video-call kit"'), ('"Caméra grand angle, micro et enceinte"', '"Wide-angle camera, microphone and speaker"'),
    ('nom:"Paperboard & fournitures"', 'nom:"Flip chart & supplies"'), ('"Paperboard, feutres, post-it, blocs"', '"Flip chart, markers, sticky notes, pads"'),
    ('${p.pers ? " / pers." : ""}', '${p.pers ? " / person" : ""}'),
    ('Retirer un', 'Remove one'), ('Ajouter un', 'Add one'),
    ('<span>TVA 20 %</span>', '<span>VAT 20%</span>'),
    ('"Payer "', '"Pay "'), ('`Continuer · ${eur(m.ttc)} TTC`', '`Continue · ${eur(m.ttc)} incl. VAT`'), ('"Continuer sans service"', '"Continue without services"'),
    ('" HT · TVA 20 % "', '" excl. VAT · VAT 20% "'), ('"Choisissez une heure."', '"Choose a time."'), ('" TTC · "', '" incl. VAT · "'),
    ('"Cochez la case pour accepter les conditions de réservation."', '"Tick the box to accept the booking terms."'),
    ('"Ce créneau vient d\'être réservé. Choisissez-en un autre."', '"This slot has just been booked. Please choose another."'),
    ('"La réservation n\'a pas pu être enregistrée."', '"The booking could not be recorded."'),
    ('Paiement en cours', 'Processing payment'), ('"Autorisation du paiement de démonstration…"', '"Authorising the demo payment…"'),
    ('</span>Réservation\'', '</span>Booking\''), ('"Réservation de la salle dans Nexudus…"', '"Booking the room in Nexudus…"'),
    ('"La connexion à Nexudus a expiré. Reconnectez Nexudus dans Réglages → Connecteurs de claude.ai, puis réessayez."', '"The Nexudus connection has expired. Reconnect Nexudus in Settings → Connectors on claude.ai, then try again."'),
    ('"Nexudus demande votre accord pour cette page. Cliquez à nouveau sur « Payer » et autorisez l\'accès."', '"Nexudus needs your permission for this page. Click “Pay” again and allow access."'),
    ('"La réponse de Nexudus n\'est pas arrivée. La réservation a peut-être été créée : vérifiez le calendrier avant de recommencer."', '"No response from Nexudus. The booking may have been created: check the calendar before trying again."'),
    ('aria-label="Votre réservation"', 'aria-label="Your booking"'), ('<span class="tag">À très vite</span>', '<span class="tag">See you soon</span>'),
    ('"Réserver une salle · créneau bloqué"', '"Book a room · slot held"'),
    ('[["Salle", s.nom], ["Créneau", quandTxt()], ...(lignesProduits().length ? [["Services",', '[["Room", s.nom], ["Time", quandTxt()], ...(lignesProduits().length ? [["Services",'),
    ('["Montant", eur(m.ttc) + " TTC (paiement simulé)"], ["Référence",', '["Amount", eur(m.ttc) + " incl. VAT (demo payment)"], ["Reference",'),
    ('Ajoutée au calendrier Nexudus : <b>${esc(s.nom)} · en attente de confirmation</b>', 'Added to the Nexudus calendar: <b>${esc(s.nom)} · awaiting confirmation</b>'),
    ('nom:"Nomade"', 'nom:"Nomad"'), ('"L\'accès libre aux plateaux, en journée, du lundi au samedi."', '"Free access to the coworking floor, daytime, Monday to Saturday."'),
    ('"Poste flexible au 1er étage"', '"Flexible desk on the 1st floor"'), ('"Fibre 10 Gb/s et impression"', '"10 Gb/s fibre and printing"'),
    ('"Café de comptoir à volonté"', '"Unlimited coffee at the bar"'), ('"2 h de salle de réunion / mois"', '"2 h of meeting room / month"'),
    ('"Événements membres"', '"Member events"'), ('"Sans engagement."', '"No commitment."'),
    ('nom:"Résident"', 'nom:"Resident"'), ('"Votre poste attitré, à vous seul, dans une zone au calme."', '"Your own dedicated desk, in a quiet area."'),
    ('"Bureau nominatif, écran sur demande"', '"Named desk, screen on request"'), ('"Accès 24/7 et casier sécurisé"', '"24/7 access and secure locker"'),
    ('"5 h de salle de réunion / mois"', '"5 h of meeting room / month"'), ('"Adresse professionnelle et courrier"', '"Business address and mail"'),
    ('"Café et événements membres"', '"Coffee and member events"'),
    ('nom:"Bureau privé"', 'nom:"Private office"'), ('"Un bureau fermé rien qu\'à vous, ou à votre équipe."', '"A closed office just for you or your team."'),
    ('"Mobilier sur mesure, plaque à la porte"', '"Bespoke furniture, name plate on the door"'), ('"Accès 24/7 et casiers sécurisés"', '"24/7 access and secure lockers"'),
    ('"10 h de salle de réunion / mois"', '"10 h of meeting room / month"'), ('"Courrier et conciergerie"', '"Mail and concierge"'), ('"Ligne fibre dédiée"', '"Dedicated fibre line"'),
    ('nom:"Domiciliation"', 'nom:"Business address"'), ('"Votre adresse au 312 boulevard Haussmann, sans le bureau."', '"Your address at 312 boulevard Haussmann, without the office."'),
    ('"Domiciliation commerciale"', '"Registered business address"'), ('"Courrier reçu, numérisé, notifié"', '"Mail received, scanned, notified"'),
    ('"Réexpédition sur demande"', '"Forwarding on request"'), ('"Salles de réunion à la carte"', '"Meeting rooms à la carte"'),
    ('"Vérification d\'identité (KYC)"', '"Identity check (KYC)"'), ('"Activation après vérification d\'identité."', '"Activated after identity check."'),
    ('<span class="badge">La plus choisie</span>', '<span class="badge">Most popular</span>'),
    ('<small>HT ${f.unite || "/ mois"}</small>', '<small>excl. VAT ${f.unite || "/ month"}</small>'),
    ('data-plan="${f.id}">Choisir ${f.nom}</button>', 'data-plan="${f.id}">Choose ${f.nom}</button>'),
    ('"Dès lundi prochain"', '"From next Monday"'), ('"Le 1er du mois prochain"', '"The 1st of next month"'), ('"Dans deux semaines"', '"In two weeks"'),
    ('${n} ${n > 1 ? "postes" : "poste"}<small>${eur(750*n)} HT / mois</small>', '${n} ${n > 1 ? "desks" : "desk"}<small>${eur(750*n)} excl. VAT / month</small>'),
    ('"Adhésion confirmée"', '"Membership confirmed"'), ('`Devenir membre · ${M.i+1} sur ${ordre.length}`', '`Become a member · ${M.i+1} of ${ordre.length}`'),
    ('"Choisissez une date de début."', '"Choose a start date."'),
    ('["Formule", ', '["Membership", '), ('${M.postes > 1 ? "postes" : "poste"}', '${M.postes > 1 ? "desks" : "desk"}'), ('["Début", ', '["Start", '),
    ('["Membre", ', '["Member", '), ('["Entreprise", ', '["Company", '), ('" HT + TVA 20 %"', '" excl. VAT + VAT 20%"'),
    ('"L\'adhésion n\'a pas pu être enregistrée."', '"The membership could not be recorded."'), ('"Cochez la case pour accepter les conditions d\'adhésion."', '"Tick the box to accept the membership terms."'),
    ('Création de votre espace membre', 'Creating your member area'), ('${v.quantite > 1 ? "postes" : "poste"}', '${v.quantite > 1 ? "desks" : "desk"}'), ('["Premier mois", ', '["First month", '),
    ('Dans Nexudus : ${res.nouveau ? "une nouvelle fiche client" : "la fiche client existante"}${res.compte ? " avec son compte d\'accès au portail" : ""}, et un contrat <b>${esc(f.nom)}</b> qui démarre le ${esc(M.debutTxt)}. Visible tout de suite dans Flow, rubrique Clients.',
     'In Nexudus: ${res.nouveau ? "a new customer record" : "the existing customer record"}${res.compte ? " with its portal login" : ""}, and a <b>${esc(f.nom)}</b> contract starting on ${esc(M.debutTxt)}. Visible straight away in Flow, under Customers.'),
    ('"La réponse de Nexudus n\'est pas arrivée. L\'adhésion a peut-être été créée : vérifiez la liste des clients avant de recommencer."', '"No response from Nexudus. The membership may have been created: check the customer list before trying again."'),
    ('ordre = ["3e", "2e", "1er", "RDC"]', 'ordre = ["3rd", "2nd", "1st", "GF"]'),
    ('"aujourd\'hui"', '"today"'),
    ('" et devenir membre"', '" and become a member"'),
    ('" TTC (paiement simulé)"], ["Référence"', '" incl. VAT (demo payment)"], ["Reference"'),
    ('`${libres} ${libres > 1 ? "postes libres" : "poste libre"} ${quand}`', '`${libres} ${libres > 1 ? "free desks" : "free desk"} ${quand}`'),
    ('`${libres} ${libres > 1 ? "postes libres" : "poste libre"} ${quand} sur vingt, à choisir sur le plan. Dès 15 € HT la demi-journée.`', '`${libres} ${libres > 1 ? "free desks" : "free desk"} ${quand} out of twenty, picked on the floor plan. From €15 excl. VAT per half day.`'),
    # chemins : la page anglaise est servie depuis /en/
    ('import("./plateau/js/plan.js")', 'import("../plateau/js/plan.js")'),
    ('"plateau/"', '"../plateau/en/"'), ('a.href = "plateau/?jour=" + jour;', 'a.href = "../plateau/en/?jour=" + jour;'),
    ('`plateau/?jour=${jour}&poste=${pt.dataset.code}`', '`../plateau/en/?jour=${jour}&poste=${pt.dataset.code}`'),
    # le serveur répond dans la langue de la page
    ('`/api/salles?salle=${salle}&jour=${jour}`', '`/api/salles?salle=${salle}&jour=${jour}&lang=en`'),
    ('"/api/postes?jour=" + jour', '"/api/postes?jour=" + jour + "&lang=en"'),
    ('fetch("/api/visite", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({', 'fetch("/api/visite", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ lang:"en",'),
    ('fetch("/api/salles", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(v) })', 'fetch("/api/salles", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ ...v, lang:"en" }) })'),
    ('fetch("/api/membres", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(v) })', 'fetch("/api/membres", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ ...v, lang:"en" }) })'),
]

# ---------------------------------------------------------------- application
erreurs = []
def remplacer(texte, avant, apres, ou):
    if avant not in texte: erreurs.append(f"[{ou}] introuvable : {avant[:90]}")
    return texte.replace(avant, apres)

i_script = src.index("<script>", src.index("<body"))
avant_js, script, apres_js = src[:i_script], src[i_script:src.rindex("</script>")], src[src.rindex("</script>"):]

# en-tête
avant_js = avant_js.replace('<html lang="fr">', '<html lang="en">')
avant_js = remplacer(avant_js, "Bureau des Légendes : coworking, bureaux privés et salles de réunion au 312 boulevard Haussmann, Paris 9e.",
                     "Bureau des Légendes: coworking, private offices and meeting rooms at 312 boulevard Haussmann, Paris 9th.", "head")
for a, b in SNIP: avant_js = remplacer(avant_js, a, b, "html")

tete, corps = avant_js[:avant_js.index("<body")], avant_js[avant_js.index("<body"):]
vus = set()
def texte(m):
    brut = m.group(1); t = brut.strip()
    if t in TEXT: vus.add(t); return ">" + brut.replace(t, TEXT[t]) + "<"
    return m.group(0)
corps = re.sub(r">([^<>]+)<", texte, corps)
def attribut(m):
    nom, val = m.group(1), m.group(2)
    if val in ATTR: vus.add("@" + val); return f'{nom}="{ATTR[val]}"'
    return m.group(0)
corps = re.sub(r'\b(alt|aria-label|placeholder|title)="([^"]+)"', attribut, corps)
for t in TEXT:
    if t not in vus and t not in {"OK", "CVC", "Contact", "Coworking", "Masterclass", "Agenda", "75009 Paris", "312, boulevard Haussmann", "312, boulevard Haussmann, 75009 Paris", "Menu", "Powered by", "La Verrière", "Participants"}:
        erreurs.append(f"[texte] non utilisé : {t[:90]}")

# textes français restants dans le corps (hors script) : on les signale
reste = []
for m in re.finditer(r">([^<>]+)<", re.sub(r"<script.*?</script>|<style.*?</style>", "", corps, flags=re.S)):
    t = m.group(1).strip()
    if re.search(r"[éèàùêç]|\b(le|la|les|des|une|vous|votre|pour|avec)\b", t) and t not in TEXT.values() and "Légendes" not in t and "Verrière" not in t and "Hunt" not in t:
        reste.append(t)

for a, b in JS: script = remplacer(script, a, b, "script")

page = tete + corps + script + apres_js
# chemins relatifs : la page est dans /en/
page = re.sub(r'(src|href)="(?!https?:|#|/|mailto:|tel:|data:|\.\./)([^"]+)"', r'\1="../\2"', page)
page = page.replace('href="../plateau/"', 'href="../plateau/en/"')
# sélecteur de langue
page = remplacer(page, '<a class="langue" href="../en/" hreflang="en" lang="en" aria-label="English version">EN</a>', '<a class="langue" href="../" hreflang="fr" lang="fr" aria-label="Version française">FR</a>', "langue")
page = remplacer(page, '<a class="langue" href="../en/" hreflang="en" lang="en">English</a>', '<a class="langue" href="../" hreflang="fr" lang="fr">Français</a>', "langue")

if reste: print("Textes français possibles encore présents :", *reste, sep="\n  ")
if erreurs:
    print(*erreurs, sep="\n"); sys.exit(1)
(RACINE / "en").mkdir(exist_ok=True)
(RACINE / "en" / "index.html").write_text(page)
print("en/index.html écrit.")

# ================================================================ Le plateau (/plateau/en/)
P = RACINE / "plateau"
def appliquer(texte, paires, ou):
    for a, b in paires: texte = remplacer(texte, a, b, ou)
    return texte

PAGE_P = [
    ('<html lang="fr">', '<html lang="en">'), ('<title>Le plateau · Bureau des Légendes</title>', '<title>The floor · Bureau des Légendes</title>'),
    ('href="../img/mark-blanc.png"', 'href="../../img/mark-blanc.png"'), ('href="plateau.css"', 'href="../plateau.css"'),
    ('href="assets/plateau-2x.webp"', 'href="../assets/plateau-2x.webp"'), ('src="js/main.js"', 'src="js/main.js"'),
    ('<a class="retour" href="/">← Bureau des Légendes</a>', '<a class="retour" href="/en/">← Bureau des Légendes</a>'),
    ('<h1>Le plateau</h1>', '<h1>The floor</h1>'), ('<p>1<sup>er</sup> étage · 20 postes flexibles</p>', '<p>1<sup>st</sup> floor · 20 flexible desks</p>'),
    ('>Liste des postes</button>', '>Desk list</button>'), ('aria-label="Date, créneau et type de poste"', 'aria-label="Date, time slot and desk type"'),
    ('>Jour</span>', '>Day</span>'), ('>Créneau</span>', '>Time slot</span>'), ('>Type de poste</span>', '>Desk type</span>'),
    ('Cliquez un poste pour le réserver · glissez pour vous déplacer · molette ou pincement pour zoomer', 'Click a desk to book it · drag to move around · scroll or pinch to zoom'),
    ('<i class="pt libre"></i>Libre</span><span><i class="pt pris"></i>Occupé</span>', '<i class="pt libre"></i>Free</span><span><i class="pt pris"></i>Taken</span>'),
    (">Vue d'ensemble</button>", '>Overview</button>'), ('aria-label="Dézoomer"', 'aria-label="Zoom out"'), ('aria-label="Zoomer"', 'aria-label="Zoom in"'),
    ('aria-label="Liste des postes"', 'aria-label="Desk list"'), ('<h2>Les postes</h2>', '<h2>The desks</h2>'),
    ('aria-label="Fermer la liste"', 'aria-label="Close the list"'), ('aria-label="Fermer la fiche"', 'aria-label="Close the desk details"'),
    ('<p>Le plateau se prépare…</p>', '<p>Preparing the floor…</p>'),
    ("Cette page a besoin de JavaScript. Vous pouvez réserver un poste depuis <a href=\"https://bureaudeslegendesparis.nexudus.site/bureaudeslegendesparis/bookings\">l'espace membre</a>.",
     'This page needs JavaScript. You can book a desk from the <a href="https://bureaudeslegendesparis.nexudus.site/bureaudeslegendesparis/bookings">member area</a>.'),
]
PLAN_P = [
    ('nom: "Poste C" +', 'nom: "Desk C" +'),
    ('fenetre: { nom: "Côté fenêtre", texte: "Face au boulevard, la meilleure lumière de l\'étage.", equipements: ["Lumière naturelle", "Bureau en chêne 150 cm", "Fibre et prises intégrées", "Casier à la journée"] }',
     'fenetre: { nom: "Window side", texte: "Facing the boulevard, the best light on the floor.", equipements: ["Daylight", "150 cm oak desk", "Built-in fibre and sockets", "Day locker"] }'),
    ('debout: { nom: "Assis-debout", texte: "Plateau réglable en hauteur, pour les longues journées.", equipements: ["Bureau assis-debout", "Fibre et prises intégrées", "Casier à la journée"] }',
     'debout: { nom: "Sit-stand", texte: "Height-adjustable desk, for long days.", equipements: ["Sit-stand desk", "Built-in fibre and sockets", "Day locker"] }'),
    ('ecran: { nom: "Double écran", texte: "Deux écrans 27 pouces, pour les dossiers à comparer.", equipements: ["Deux écrans 27 pouces", "Station d\'accueil USB-C", "Fibre et prises intégrées", "Casier à la journée"] }',
     'ecran: { nom: "Dual screen", texte: "Two 27-inch screens, for side-by-side work.", equipements: ["Two 27-inch screens", "USB-C docking station", "Built-in fibre and sockets", "Day locker"] }'),
    ('calme: { nom: "Bibliothèque", texte: "Derrière la verrière d\'atelier. Ici, on ne téléphone pas.", equipements: ["Zone silencieuse", "Bureau en chêne 150 cm", "Fibre et prises intégrées", "Casier à la journée"] }',
     'calme: { nom: "Library", texte: "Behind the workshop glass wall. No phone calls here.", equipements: ["Quiet zone", "150 cm oak desk", "Built-in fibre and sockets", "Day locker"] }'),
]
DONNEES_P = [
    ('`/api/postes?jour=${jour}`', '`/api/postes?jour=${jour}&lang=en`'),
    ('body: JSON.stringify(v)', 'body: JSON.stringify({ ...v, lang: "en" })'),
    ('"Disponibilités indisponibles pour le moment."', '"Availability is unavailable at the moment."'),
    ('"Ce poste vient d\'être réservé."', '"This desk has just been booked."'),
    ('"La réservation n\'a pas pu être enregistrée."', '"The booking could not be recorded."'), ('"Poste inconnu."', '"Unknown desk."'),
]
MAIN_P = [
    ('import("./scene.js")', 'import("../../js/scene.js")'),
    ('"fr-FR"', '"en-GB"'),
    ('{ matin: "Matin", apres: "Après-midi", journee: "Journée" }', '{ matin: "Morning", apres: "Afternoon", journee: "Full day" }'),
    ('{ libre: "Libre", pris: "Occupé", passe: "Indisponible", attente: "…" }', '{ libre: "Free", pris: "Taken", passe: "Unavailable", attente: "…" }'),
    ('`${h.de} h – ${h.a} h`', '`${h.de}:00 – ${h.a}:00`'),
    ('["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."]', '["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'),
    ('["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]', '["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]'),
    ('"auj."', '"today"'), ('t: "Tous"', 't: "All"'),
    ('"Disponibilités indisponibles pour le moment."', '"Availability is unavailable at the moment."'),
    ('"Lecture des disponibilités…"', '"Loading availability…"'),
    ('${libres > 1 ? "postes libres" : "poste libre"} sur ${visibles.length}', '${libres === 1 ? "free desk" : "free desks"} out of ${visibles.length}'),
    ('id="reessayer">Réessayer</button>', 'id="reessayer">Try again</button>'),
    ('"Aperçu hors ligne : les disponibilités sont simulées et aucune réservation n\'est enregistrée."', '"Offline preview: availability is simulated and no booking is recorded."'),
    ('" · " + eur(px) + " HT"', '" · " + eur(px) + " excl. VAT"'),
    ('Poste flexible · ${esc(z.nom)}', 'Flexible desk · ${esc(z.nom)}'),
    ('"Réservation simulée." : `C\'est noté, ${esc(r.prenom)}.`', '"Simulated booking." : `All set, ${esc(r.prenom)}.`'),
    ('"Cet aperçu fonctionne hors ligne : <b>rien n\'a été enregistré</b> dans Nexudus et aucun poste n\'est réellement réservé."', '"This preview works offline: <b>nothing has been recorded</b> in Nexudus and no desk is actually booked."'),
    ('`Votre poste est bloqué à votre nom. La réservation est enregistrée dans Nexudus, en attente de confirmation par l\'équipe. Un e-mail vous sera envoyé à ${esc(r.email)}.`',
     '`The desk is held in your name. The booking is recorded in Nexudus, awaiting confirmation by the team. An email will be sent to ${esc(r.email)}.`'),
    ('<li><span>Poste</span>', '<li><span>Desk</span>'), ('<span>Quand</span>', '<span>When</span>'), ('<li><span>Montant</span>${eur(r.ttc)} TTC${r.simule ? "" : " (paiement de démonstration)"}', '<li><span>Amount</span>${eur(r.ttc)} incl. VAT${r.simule ? "" : " (demo payment)"}'),
    ('<span>Référence</span>', '<span>Reference</span>'), ('style="margin-top:auto">Retour au plateau</button>', 'style="margin-top:auto">Back to the floor</button>'),
    ('<li><span>Pour</span>', '<li><span>For</span>'),
    ('"<b>Aperçu hors ligne :</b> le paiement et la réservation sont simulés, rien ne sera enregistré." : "<b>Paiement de démonstration :</b> aucune carte n\'est débitée, la réservation est bien enregistrée."',
     '"<b>Offline preview:</b> payment and booking are simulated, nothing will be recorded." : "<b>Demo payment:</b> no card is charged, and the booking is recorded."'),
    ('>Numéro de carte</label>', '>Card number</label>'), ('>Expiration</label>', '>Expiry</label>'), ('>Titulaire</label>', '>Cardholder</label>'),
    ('<span>Total TTC</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} HT</small></div></div>\n      <button class="btn" type="button" data-act="payer"', '<span>Total incl. VAT</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} excl. VAT</small></div></div>\n      <button class="btn" type="button" data-act="payer"'),
    ('esc(E.statut || "Paiement en cours")}` : "Payer " + eur(px * 1.2)}', 'esc(E.statut || "Processing payment")}` : "Pay " + eur(px * 1.2)}'),
    ('>← Coordonnées</button>', '>← Details</button>'),
    ('>Prénom</label>', '>First name</label>'), ('>Nom</label>', '>Last name</label>'), ('>E-mail</label>', '>Email</label>'), ('>Entreprise (facultatif)</label>', '>Company (optional)</label>'), ('>Site web</label>', '>Website</label>'),
    ("J'accepte les conditions de réservation : annulation gratuite jusqu'à la veille.", 'I accept the booking terms: free cancellation until the day before.'),
    ('<span>Total TTC</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} HT</small></div></div>\n        <button class="btn" type="submit">Passer au paiement</button>', '<span>Total incl. VAT</span><div><b>${eur(px * 1.2)}</b><small>${eur(px)} excl. VAT</small></div></div>\n        <button class="btn" type="submit">Go to payment</button>'),
    ('>← Retour au poste</button>', '>← Back to the desk</button>'),
    ('libre ? `Libre · ${esc(jourLong(E.jour))}` : e === "pris" ? `${reste ? `Occupé ${DEMI[reste === "matin" ? "apres" : "matin"]}, libre ${DEMI[reste]}` : "Déjà réservé sur ce créneau"} · ${esc(jourLong(E.jour))}` : `Indisponible · ${esc(jourLong(E.jour))}`',
     'libre ? `Free · ${esc(jourLong(E.jour))}` : e === "pris" ? `${reste ? `Taken ${DEMI[reste === "matin" ? "apres" : "matin"]}, free ${DEMI[reste]}` : "Already booked for this slot"} · ${esc(jourLong(E.jour))}` : `Unavailable · ${esc(jourLong(E.jour))}`'),
    ('{ matin: "le matin", apres: "l\'après-midi" }', '{ matin: "in the morning", apres: "in the afternoon" }'),
    ('>Voir ${DEMI[reste]} · ${eur(prix(reste))} HT</button>', '>See it ${DEMI[reste]} · ${eur(prix(reste))} excl. VAT</button>'),
    ('margin-bottom:8px">Créneau</span>', 'margin-bottom:8px">Time slot</span>'),
    ('${libre ? "Prix HT" : "Ce créneau"}', '${libre ? "Price excl. VAT" : "This slot"}'), ('<small>${eur(px * 1.2)} TTC</small>', '<small>${eur(px * 1.2)} incl. VAT</small>'),
    ('${libre ? "Réserver ce poste" : e === "pris" ? "Poste occupé" : "Indisponible"}', '${libre ? "Book this desk" : e === "pris" ? "Desk taken" : "Unavailable"}'),
    ('data-act="autre">Voir un poste libre du même type</button>', 'data-act="autre">See a free desk of the same type</button>'),
    ('"Indiquez votre prénom."', '"Please enter your first name."'), ('"Indiquez votre nom."', '"Please enter your last name."'), ('"Cette adresse e-mail n\'est pas valide."', '"This email address is not valid."'),
    ('"Cochez la case pour accepter les conditions de réservation."', '"Tick the box to accept the booking terms."'),
    ('E.statut = "Paiement en cours"; E.statutLong = "Autorisation du paiement de démonstration…";', 'E.statut = "Processing payment"; E.statutLong = "Authorising the demo payment…";'),
    ('E.statut = "Réservation"; E.statutLong = donnees.source === "simule" ? "Réservation simulée…" : "Réservation du poste dans Nexudus…";', 'E.statut = "Booking"; E.statutLong = donnees.source === "simule" ? "Simulating the booking…" : "Booking the desk in Nexudus…";'),
    ('"La connexion a été interrompue. La réservation a peut-être été enregistrée : vérifiez l\'état du poste avant de recommencer."', '"The connection was interrupted. The booking may have been recorded: check the desk status before trying again."'),
    ('"La réservation n\'a pas pu être enregistrée."', '"The booking could not be recorded."'),
    ('"Aucun poste libre sur ce créneau. Essayez un autre jour."', '"No free desk for this slot. Try another day."'),
    ('"La vue du plateau n\'a pas pu se charger. Vous pouvez réserver depuis la liste."', '"The floor view could not load. You can book from the list."'),
]
(P / "en" / "js").mkdir(parents=True, exist_ok=True)
sorties = {
    P / "en" / "index.html": appliquer((P / "index.html").read_text(), PAGE_P, "plateau/index"),
    P / "en" / "js" / "plan.js": appliquer((P / "js" / "plan.js").read_text(), PLAN_P, "plateau/plan"),
    P / "en" / "js" / "donnees.js": appliquer((P / "js" / "donnees.js").read_text(), DONNEES_P, "plateau/donnees"),
    P / "en" / "js" / "main.js": appliquer((P / "js" / "main.js").read_text(), MAIN_P, "plateau/main"),
}
if erreurs:
    print(*erreurs, sep="\n"); sys.exit(1)
for f, t in sorties.items(): f.write_text("// Fichier généré par outils/en.py à partir de la version française : ne pas modifier à la main.\n" + t if f.suffix == ".js" else t)
print("plateau/en/ écrit.")

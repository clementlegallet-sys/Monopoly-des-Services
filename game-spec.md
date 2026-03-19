# Monopoly des Services

## Objectif
Le but du jeu est de devenir le joueur ayant conquis le plus de clients en fin de partie.

## Départ
- Chaque joueur commence sur la case Départ.
- Chaque joueur commence avec 2 jetons Client.
- Il y a une Banque de Clients centrale.

## Déroulement d’un tour
- Le joueur lance 1 dé à 6 faces.
- Il avance du nombre de cases indiqué.
- Il applique l’effet de la case sur laquelle il tombe.

## Types de cases
- Départ
- Chance
- Service EDF
- ?
- Histoire
- Place du Marché
- Argument de vente (BAC)
- Objection

## Règles par type de case

### Chance
- Le joueur répond à une question.
- Si la réponse est correcte : +2 clients.

### Service EDF
- Le joueur doit donner 2 avantages ou bénéfices du service.
- Si validé : il gagne la pièce service correspondante.

### Case ?
- Le joueur doit poser une question ouverte de découverte adaptée au service/couleur.
- Si validé : +1 client.

### Histoire
- Le joueur doit raconter une anecdote ou une situation d’usage mettant en valeur le service.
- Si validé : +1 client.

### Objection
- Le joueur tire une objection et doit y répondre avec la méthode AREF.
- Si validé : +1 client.

### Argument de vente (BAC)
- Le joueur doit construire une phrase en commençant par le bénéfice, puis un avantage, puis une caractéristique.
- Si validé : +1 client.

### Place du Marché
Le joueur peut :
- échanger une pièce service avec un autre joueur
ou
- vendre une pièce service à la banque pour 2, 3 ou 5 clients.

## Bonus Enseigne Complète
Si un joueur possède toutes les pièces d’une même couleur :
- il obtient une enseigne complète,
- lorsqu’un autre joueur gagne 1 client sur une case ? ou Histoire de cette même couleur,
- le propriétaire de l’enseigne complète gagne aussi 1 client.

## Fin de partie
- La partie se termine quand la Banque de Clients est vide.
- Ensuite, chaque joueur fait un coup bonus :
  - si le dé fait 1 : il prend 1 client à un joueur adjacent,
  - si le dé fait 6 : il prend 2 clients au joueur de son choix.
- Le joueur avec le plus de clients gagne.

## Services à intégrer
- Assistance Dépannage
- Protection Facture
- IZI by EDF
- Thermostat connecté Sowee
- IZI Confort
- Homiris

## UX attendue
Créer une application web locale en React + TypeScript + Vite avec :
- écran d’accueil,
- paramétrage des joueurs,
- plateau de jeu,
- cartes/modales par type de case,
- score automatique,
- gestion des pièces service,
- gestion des enseignes complètes,
- écran de fin.

## Contraintes
- pas de backend,
- stockage local avec localStorage,
- interface claire, moderne, ludique,
- validation des réponses par un animateur via boutons "Réponse validée" / "Réponse refusée".

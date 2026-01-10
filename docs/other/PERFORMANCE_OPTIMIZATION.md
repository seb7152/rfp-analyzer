# Optimisation des Performances de la Page Summary

## Problème Identifié

L'utilisateur a signalé un grand nombre d'appels API vers `completion` et `response` lors du chargement de la page `/summary`.
Après analyse, le problème provenait du composant `SuppliersTab` (qui est chargé par défaut dans l'onglet "Tableau de bord").

Ce composant effectuait une boucle sur chaque fournisseur pour récupérer :

1. Ses documents (`/api/rfps/[rfpId]/documents?supplierId=...`)
2. Son score de complétion (`/api/rfps/[rfpId]/suppliers/[supplierId]/completion`)
3. Ses statistiques de réponse (`/api/rfps/[rfpId]/suppliers/[supplierId]/responses`)

Pour 10 fournisseurs, cela générait **30 appels API supplémentaires** en plus de la liste des fournisseurs. C'est le problème "N+1" classique.

## Solution Mise en Place

### 1. Optimisation de l'API Backend

J'ai modifié l'endpoint `GET /api/rfps/[rfpId]/suppliers` pour accepter un paramètre `includeStats=true`.

Lorsqu'il est activé, cet endpoint :

- Récupère tous les fournisseurs.
- Récupère en **une seule fois** (via `Promise.all`) :
  - Toutes les catégories et exigences (pour les pondérations).
  - Toutes les réponses de l'appel d'offres.
  - Tous les documents de l'appel d'offres.
  - Les liens entre documents et fournisseurs.
- Calcule en mémoire les scores et statistiques pour chaque fournisseur.
- Associe les documents à chaque fournisseur.

Cela remplace les N\*3 appels par **1 seul appel optimisé**.

### 2. Mise à jour du Frontend

J'ai mis à jour `components/RFPSummary/SuppliersTab.tsx` pour :

- Utiliser le nouvel endpoint : `/api/rfps/${rfpId}/suppliers?includeStats=true`.
- Supprimer la boucle `Promise.all` qui effectuait les appels individuels.
- Utiliser directement les données enrichies renvoyées par l'API.

## Résultat

- **Réduction drastique du nombre de requêtes** : Passage de ~30+ requêtes à 1 seule pour charger la liste des fournisseurs.
- **Amélioration du temps de chargement** : Le chargement initial du tableau de bord devrait être beaucoup plus rapide.
- **Moins de charge serveur** : Moins d'ouvertures de connexions base de données simultanées.

## Autres Onglets

Les autres onglets (`WeightsTab`, `AnalystsTab`, `RequirementsTab`, `AnalysisTab`) effectuent un nombre raisonnable d'appels (2-3 max) et ne posent pas de problème de performance majeur. De plus, grâce à la gestion par défaut de Radix UI, leur contenu n'est monté (et donc chargé) que lorsque l'utilisateur clique dessus, sauf s'ils sont inclus dans la vue par défaut.

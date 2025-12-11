# Tests Manuels - Mode Offline

Guide pour tester la fonctionnalité de mode offline avec synchronisation différée.

## Prérequis

1. Application démarrée en mode dev : `npm run dev`
2. Navigateur avec DevTools ouvert (Chrome, Firefox, Safari)
3. Un RFP avec des requirements et réponses chargées

## Test 1 : Modification Offline Basique

**Objectif** : Vérifier que les modifications fonctionnent en mode offline et se synchronisent automatiquement

### Étapes

1. Ouvrir la page `/dashboard/rfp/[rfpId]/evaluate`
2. Sélectionner un requirement avec des réponses
3. **Activer le mode offline** :
   - Chrome DevTools → Network tab → "Offline" checkbox
   - Ou : Menu burger (⋮) → More tools → Network conditions → Offline
4. **Faire une modification** :
   - Changer le statut d'une réponse (Pass/Partial/Fail)
   - OU modifier le score manuel
   - OU ajouter un commentaire
5. **Vérifier** :
   - ✅ Badge orange "Offline" apparaît dans le header
   - ✅ Compteur "1" s'affiche à côté du badge
   - ✅ Toast "Enregistré localement - sera synchronisé..." apparaît
   - ✅ L'interface se met à jour instantanément (optimistic update)
6. **Désactiver le mode offline** :
   - Chrome DevTools → Network tab → Décocher "Offline"
7. **Vérifier la synchronisation** :
   - ✅ Badge devient bleu "Synchronisation..."
   - ✅ Spinner animé visible
   - ✅ Toast "1 modification synchronisée" apparaît
   - ✅ Badge disparaît
   - ✅ Données visibles dans la DB (rafraîchir la page pour confirmer)

**Résultat attendu** : La modification est sauvegardée même offline et synchronisée automatiquement

---

## Test 2 : Modifications Multiples Offline

**Objectif** : Vérifier que plusieurs modifications peuvent être mises en queue

### Étapes

1. Activer le mode offline (DevTools)
2. **Faire 5 modifications différentes** :
   - Modifier statut de réponse 1
   - Modifier score de réponse 2
   - Ajouter commentaire à réponse 3
   - Modifier statut de réponse 4
   - Cocher la checkbox de réponse 5
3. **Vérifier après chaque modification** :
   - ✅ Badge "Offline" affiche le bon compteur (1, 2, 3, 4, 5)
   - ✅ Toutes les modifications sont visibles dans l'interface
4. **Désactiver le mode offline**
5. **Vérifier** :
   - ✅ Badge "Synchronisation..." avec compteur décroissant
   - ✅ Toast "5 modifications synchronisées"
   - ✅ Badge disparaît
   - ✅ Toutes les modifications persistent après refresh

**Résultat attendu** : Toutes les modifications sont synchronisées dans l'ordre

---

## Test 3 : Mode Offline sur Mobile

**Objectif** : Vérifier le badge compact sur mobile

### Étapes

1. Ouvrir DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Sélectionner "iPhone 12 Pro" ou "iPad"
3. Activer mode offline
4. Faire une modification
5. **Vérifier** :
   - ✅ Badge compact visible (icône + compteur, pas de texte)
   - ✅ Badge ne déborde pas du header mobile
   - ✅ Fonctionnalité identique à desktop

**Résultat attendu** : Badge adapté au mobile, fonctionnalité identique

---

## Test 4 : Persistance après Refresh

**Objectif** : Vérifier que les modifications offline survivent à un refresh

### Étapes

1. Activer mode offline
2. Faire 2-3 modifications
3. **Rafraîchir la page (F5)** sans désactiver offline
4. **Vérifier** :
   - ✅ Badge "Offline" apparaît toujours
   - ✅ Compteur affiche le bon nombre (2-3)
   - ✅ Modifications toujours visibles dans l'interface
5. Désactiver offline
6. **Vérifier** :
   - ✅ Synchronisation se lance automatiquement
   - ✅ Toast "X modifications synchronisées"

**Résultat attendu** : La queue localStorage survit aux refreshs

---

## Test 5 : Erreur Réseau Simulée

**Objectif** : Vérifier le comportement en cas d'erreur API

### Étapes

1. Rester en mode **online**
2. **Bloquer l'endpoint API** :
   - DevTools → Network tab
   - Clic droit → "Block request URL"
   - Pattern : `*/api/responses/*`
3. Faire une modification
4. **Vérifier** :
   - ✅ Toast d'erreur apparaît
   - ✅ Modification est rollback (UI revient à l'état précédent)
5. **Débloquer l'API**
6. Refaire la modification
7. **Vérifier** :
   - ✅ Modification réussit normalement

**Résultat attendu** : Erreurs réseau sont gérées proprement

---

## Test 6 : Navigation entre Requirements

**Objectif** : Vérifier que le compteur persiste pendant navigation

### Étapes

1. Activer offline
2. Sur requirement #1 : faire 2 modifications
3. **Vérifier** : Badge "Offline (2)"
4. **Naviguer vers requirement #2**
5. **Vérifier** : Badge "Offline (2)" toujours visible
6. Faire 1 modification sur requirement #2
7. **Vérifier** : Badge "Offline (3)"
8. Désactiver offline
9. **Vérifier** : Les 3 modifications se synchronisent

**Résultat attendu** : Le compteur global fonctionne à travers la navigation

---

## Test 7 : Nettoyage Automatique

**Objectif** : Vérifier que les vieilles mutations sont supprimées

### Étapes

1. **Inspecter localStorage** :
   - DevTools → Application tab → Local Storage
   - Chercher clé : `rfp-analyzer-offline-queue`
2. **Modifier manuellement** la date d'une mutation pour être > 7 jours

```javascript
// Dans Console DevTools
let queue = JSON.parse(localStorage.getItem("rfp-analyzer-offline-queue"));
queue[0].timestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 jours
localStorage.setItem("rfp-analyzer-offline-queue", JSON.stringify(queue));
```

3. **Rafraîchir la page**
4. **Vérifier** :
   - ✅ Mutation vieille est supprimée automatiquement
   - ✅ Compteur ne l'inclut pas

**Résultat attendu** : Nettoyage automatique des mutations > 7 jours

---

## Test 8 : Mode Avion sur Téléphone Réel

**Objectif** : Test sur appareil mobile physique

### Étapes

1. Ouvrir l'app sur un téléphone (iOS ou Android)
2. Activer **Mode Avion**
3. Faire 3-5 modifications
4. **Vérifier** : Badge compact "Offline" avec compteur
5. **Désactiver Mode Avion**
6. **Vérifier** :
   - ✅ Synchronisation automatique
   - ✅ Toast de confirmation
   - ✅ Modifications persistées

**Résultat attendu** : Fonctionne parfaitement sur mobile réel

---

## Cas Limites à Tester

### Cas 1 : Connexion Intermittente

- Activer/désactiver offline rapidement plusieurs fois
- Vérifier que la synchronisation ne se lance qu'une fois

### Cas 2 : Multi-Onglets

- Ouvrir 2 onglets sur le même RFP
- Faire modification offline dans onglet 1
- Désactiver offline dans onglet 1
- Vérifier que onglet 2 voit aussi la modification après refresh

### Cas 3 : localStorage Plein

- Remplir localStorage artificiellement
- Vérifier comportement gracieux (erreur loggée, pas de crash)

---

## Commandes Utiles DevTools

```javascript
// Vider la queue offline
localStorage.removeItem("rfp-analyzer-offline-queue");

// Voir le contenu de la queue
JSON.parse(localStorage.getItem("rfp-analyzer-offline-queue"));

// Compter les mutations en attente
JSON.parse(localStorage.getItem("rfp-analyzer-offline-queue")).length;

// Simuler mutation ancienne (> 7 jours)
let q = JSON.parse(localStorage.getItem("rfp-analyzer-offline-queue"));
q[0].timestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
localStorage.setItem("rfp-analyzer-offline-queue", JSON.stringify(q));
```

---

## Checklist de Validation

Avant de considérer la feature comme validée :

- [ ] Test 1 : Modification offline basique ✅
- [ ] Test 2 : Modifications multiples ✅
- [ ] Test 3 : Mode mobile compact ✅
- [ ] Test 4 : Persistance refresh ✅
- [ ] Test 5 : Gestion erreurs ✅
- [ ] Test 6 : Navigation requirements ✅
- [ ] Test 7 : Nettoyage auto ✅
- [ ] Test 8 : Mode avion mobile ✅
- [ ] Badge visible sur desktop ✅
- [ ] Badge visible sur mobile ✅
- [ ] Toasts appropriés ✅
- [ ] Pas de régression sur mode online ✅

---

## Problèmes Connus / Limitations

1. **localStorage limité à ~5-10MB** : OK pour centaines de mutations
2. **Last-write-wins** : Pas de merge intelligent si conflit
3. **Pas de cache complet** : Besoin de connexion pour charger nouveaux RFPs
4. **Pas de PDFs offline** : Documents nécessitent connexion

---

**Date création** : 2025-12-10
**Auteur** : Claude Code
**Version** : 1.0

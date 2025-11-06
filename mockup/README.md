# RFP Analyzer - Mockup Interface

Mockup interactif de la plateforme d'analyse de réponses à appels d'offres (RFP).

## 📋 Aperçu

Ce mockup démontre l'interface principale de l'application RFP Analyzer avec:

- **Sidebar hiérarchique** : Navigation arborescente des exigences avec recherche
- **Navbar** : Onglets de navigation (Configuration, Comparaison, Réponses) + thème jour/nuit
- **Vue comparative** : Affichage côte à côte des réponses des fournisseurs par exigence
- **Breadcrumb** : Navigation hiérarchique de l'exigence sélectionnée
- **Pagination** : Navigation rapide entre les exigences
- **Tableau extensible** : Détails complets des réponses (scores, commentaires, questions)

## 🚀 Installation

```bash
cd mockup
npm install
```

## 🏃 Démarrage

```bash
npm run dev
```

Accédez à `http://localhost:3000/dashboard` dans votre navigateur.

## 📁 Structure du projet

```
mockup/
├── components/
│   ├── Navbar.tsx              # Barre de navigation avec onglets et thème
│   ├── Sidebar.tsx             # Sidebar avec arborescence des exigences
│   ├── ComparisonView.tsx      # Vue principale de comparaison
│   └── ui/                     # Composants shadcn/ui
│       ├── button.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── textarea.tsx
│       ├── tabs.tsx
│       ├── breadcrumb.tsx
│       ├── pagination.tsx
│       └── table.tsx
├── pages/
│   └── dashboard.tsx           # Page principale
├── lib/
│   ├── fake-data.ts           # Données factices pour le mockup
│   └── utils.ts               # Utilitaires (cn, etc)
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🎨 Fonctionnalités du Mockup

### Sidebar
- **Recherche** : Filtrez les exigences par ID ou titre
- **Arborescence** : Navigation hiérarchique sur 4 niveaux
- **Sélection** : Clic sur une exigence pour afficher les détails

### Vue Comparative
- **Breadcrumb** : Montre le chemin de navigation (Domaine > Catégorie > Sous-catégorie > Exigence)
- **Pagination** : Naviguez rapidement entre les exigences
- **Pondération** : Affichage du poids de l'exigence
- **Contexte** : Description et contexte du cahier des charges
- **Tableau extensible** :
  - Lignes par fournisseur
  - Score IA (non-modifiable, grisé)
  - Étoiles de rating visuelles
  - Score manuel (modifiable)
  - Status badge (Pass/Partial/Fail/Pending)
  - Expansion pour voir détails complets

### Détails étendus
- Réponse complète du fournisseur
- Commentaire IA
- Champ pour score manuel
- Champ pour commentaire utilisateur
- Champ pour questions/doutes

### Thème
- Toggle jour/nuit dans la navbar
- Style Vercel noir et blanc
- Dark mode avec Tailwind CSS

## 📊 Données Factices

Le mockup utilise des données structurées:

```
- 3 domaines
- 6 catégories
- 8 sous-catégories
- 8 exigences (niveau 4)
- 4 fournisseurs
- 32 réponses (8 exigences × 4 fournisseurs)
```

Chaque réponse a:
- Texte de réponse
- Score IA (0-5)
- Commentaire IA
- Status d'analyse
- Champs modifiables (score manuel, commentaires, questions)

## 🔧 Technologies

- **Next.js 14** : Framework React
- **React 18** : Librairie UI
- **Tailwind CSS** : Styling
- **shadcn/ui** : Composants UI
- **Lucide React** : Icônes
- **TypeScript** : Typage statique

## 📝 Notes de conception

### UX Decisions
1. **Sidebar collapsible** : Permet de maximiser l'espace de contenu
2. **Expansion des lignes** : Voir détails sans quitter l'exigence
3. **Étoiles de rating** : Visuel simple et intuitif pour les scores
4. **Breadcrumb** : Contexte constant de la navigation
5. **Pagination** : Naviger entre les exigences sans scroller le sidebar

### Couleurs et Styling
- **Vercel-style** : Noir (#000), blanc (#fff), gris neutre
- **Semantic colors** : Rouge pour les erreurs, vert pour les succès, jaune pour les avertissements
- **Dark mode** : Mode nuit complet avec contraste approprié

## 🎯 Points de Brainstorm à adresser

1. **Disposition du PDF viewer** :
   - Panel côté droit?
   - Modal overlay?
   - Nouvel onglet?

2. **Vue "Fiche Fournisseur"** :
   - Synthèse par fournisseur
   - Scores pondérés par domaine
   - Comparaison visuelle

3. **Dashboard de synthèse** :
   - Tableau comparatif tous fournisseurs
   - Tri/filtres
   - Export Excel

4. **Édition des pondérations** :
   - V2 feature
   - Interface de gestion

5. **Interactions avancées** :
   - Drag & drop pour réorganiser?
   - Bulk actions sur les réponses?
   - Collaboration temps réel?

## 📌 Prochaines étapes

1. ✅ Mockup statique (actuellement)
2. ⬜ Intégration PDF viewer (react-pdf)
3. ⬜ Onglet "Fiche Fournisseur"
4. ⬜ Onglet "Dashboard Synthèse"
5. ⬜ Backend API (Next.js routes)
6. ⬜ Intégration Supabase
7. ⬜ Intégration N8N workflows
8. ⬜ Authentification

## 🤝 Feedback & Amélioration

Pour améliorer le mockup:
- Testez la navigation et l'UX
- Vérifiez les proportions et espacements
- Suggérez des ajustements de couleurs/typographie
- Identifiez les données manquantes
- Proposez des interactions additionnelles

---

**Créé le:** 2025-11-05  
**Version du mockup:** 0.1.0

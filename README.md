# RFP Analyzer Platform

> Plateforme d'analyse et de comparaison des réponses des fournisseurs aux appels d'offres (RFP)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

## 📋 Vue d'ensemble

RFP Analyzer est une application web full-stack qui permet aux équipes d'évaluation de :
- 📂 **Explorer** une hiérarchie structurée d'exigences (4 niveaux)
- 🔍 **Comparer** les réponses de 4-10 fournisseurs côte à côte
- ⭐ **Noter** et évaluer manuellement chaque réponse
- 💬 **Commenter** et poser des questions sur les réponses
- 📊 **Suivre** la progression de l'évaluation
- 🌓 **Basculer** entre mode clair et sombre

### Cas d'usage

- **Équipes d'évaluation** : 2-3 évaluateurs travaillant sur 4-5 RFP par an
- **Volume** : 50-200 exigences par RFP, 4-10 fournisseurs
- **Workflow** : Analyse comparative avec scoring manuel et commentaires

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ 
- npm 9+
- Compte Supabase (gratuit)

### Installation

```bash
# Cloner le repository
git clone https://github.com/seb7152/rfp-analyzer.git
cd rfp-analyzer

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Ajouter vos clés Supabase dans .env.local

# Lancer les migrations
npm run migrate

# Seed des données de développement (optionnel)
npm run seed

# Démarrer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

📖 **Guide complet** : [specs/001-rfp-analyzer-platform/quickstart.md](specs/001-rfp-analyzer-platform/quickstart.md)

## 🏗️ Architecture

### Stack technique

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript 5.x
- Tailwind CSS 3.x
- shadcn/ui components
- TanStack Query (React Query)

**Backend**
- Next.js API Routes
- Supabase (PostgreSQL 15+)
- Supabase JS Client 2.x

**Tests**
- Jest + React Testing Library (unit)
- Playwright (E2E)

**Déploiement**
- Vercel (frontend + API)
- Supabase Cloud (database)

### Structure du projet

```
rfp-analyzer/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── dashboard/         # Interface principale
├── components/            # Composants React
│   ├── ui/               # shadcn/ui primitives
│   ├── Navbar.tsx        # Navigation
│   ├── Sidebar.tsx       # Arbre des exigences
│   └── ComparisonView.tsx # Vue comparative
├── lib/                   # Utilitaires
│   └── supabase/         # Client Supabase
├── specs/                 # Documentation du projet
│   └── 001-rfp-analyzer-platform/
│       ├── spec.md       # Spécification fonctionnelle
│       ├── plan.md       # Plan d'implémentation
│       ├── data-model.md # Schéma de base de données
│       └── contracts/    # API contracts (OpenAPI)
└── mockup/               # Prototype fonctionnel
```

## 📚 Documentation

### Spécifications

- **[spec.md](specs/001-rfp-analyzer-platform/spec.md)** - Spécification fonctionnelle complète
  - 7 user stories (P1-P3)
  - 33 exigences fonctionnelles
  - 10 critères de succès
  
- **[plan.md](specs/001-rfp-analyzer-platform/plan.md)** - Plan d'implémentation
  - Contexte technique détaillé
  - Structure du projet
  - Décisions architecturales

- **[data-model.md](specs/001-rfp-analyzer-platform/data-model.md)** - Modèle de données
  - Schéma PostgreSQL complet
  - Migrations SQL
  - Requêtes communes

- **[research.md](specs/001-rfp-analyzer-platform/research.md)** - Recherche technique
  - Décisions technologiques justifiées
  - Patterns architecturaux
  - Optimisations de performance

- **[quickstart.md](specs/001-rfp-analyzer-platform/quickstart.md)** - Guide développeur
  - Installation pas à pas
  - Configuration Supabase
  - Troubleshooting

- **[contracts/api.yaml](specs/001-rfp-analyzer-platform/contracts/api.yaml)** - API OpenAPI 3.0
  - 7 endpoints REST
  - Schémas de données
  - Exemples de requêtes/réponses

### Mockup

Un prototype fonctionnel est disponible dans `/mockup` :

```bash
cd mockup
npm install
npm run dev
```

Le mockup démontre :
- Navigation hiérarchique (4 niveaux)
- Vue comparative des réponses
- Système de notation (étoiles)
- Badges de statut (Conforme/Partiel/Non conforme)
- Mode sombre/clair
- Design responsive

## 🎯 Fonctionnalités principales

### ✅ MVP (Version 1.0)

- [x] Navigation hiérarchique des exigences (4 niveaux)
- [x] Recherche et filtrage en temps réel
- [x] Vue comparative des réponses fournisseurs
- [x] Notation manuelle (0-5 étoiles)
- [x] Statuts d'évaluation (Pending/Pass/Partial/Fail)
- [x] Commentaires et questions par réponse
- [x] Suivi de progression (checkboxes)
- [x] Pagination entre exigences
- [x] Mode sombre/clair
- [x] Contexte RFP collapsible

### 🚧 Prochaines versions (V2+)

- [ ] Authentification utilisateurs (Supabase Auth)
- [ ] Gestion multi-tenant (RLS)
- [ ] Collaboration temps réel
- [ ] Historique des modifications (audit trail)
- [ ] Export Excel des analyses
- [ ] Modification des pondérations
- [ ] Dashboard de synthèse
- [ ] Graphiques comparatifs
- [ ] Visionneuse PDF intégrée
- [ ] Optimisation mobile

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests unitaires en mode watch
npm run test:watch

# Tests E2E
npm run test:e2e

# Couverture
npm run test:coverage
```

## 🚢 Déploiement

### Vercel (Recommandé)

1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Déployer automatiquement sur push

### Checklist pré-déploiement

- [ ] Tous les tests passent
- [ ] Build réussit : `npm run build`
- [ ] Variables d'environnement configurées
- [ ] Migrations appliquées sur Supabase prod
- [ ] Lighthouse score > 90

## 🤝 Contribution

### Workflow Git

```bash
# Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# Committer avec des messages descriptifs
git commit -m "feat: ajouter filtrage par statut"

# Pousser et créer une PR
git push origin feature/ma-fonctionnalite
```

### Standards de code

- TypeScript strict mode
- ESLint + Prettier
- Tests pour les nouvelles fonctionnalités
- Documentation des décisions techniques

## 📝 Licence

Ce projet est sous licence [MIT](LICENSE).

## 👥 Équipe

Développé avec ❤️ pour optimiser les processus d'évaluation RFP.

## 📞 Support

- **Documentation** : [specs/001-rfp-analyzer-platform/](specs/001-rfp-analyzer-platform/)
- **Issues** : [GitHub Issues](https://github.com/seb7152/rfp-analyzer/issues)

---

**Status** : 🚧 En développement actif | **Version** : 0.1.0-alpha

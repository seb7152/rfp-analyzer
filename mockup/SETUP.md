# Guide d'installation du Mockup

## Prérequis

- Node.js 18+ 
- npm ou pnpm

## Installation complète

```bash
cd mockup

# 1. Installer les dépendances
npm install

# 2. Démarrer le serveur de développement
npm run dev
```

Le mockup sera accessible à: **http://localhost:3000/dashboard**

## Dossiers créés

```
mockup/
├── app/
│   ├── layout.tsx          # Layout racine
│   ├── page.tsx            # Page home (redirect /dashboard)
│   ├── dashboard/
│   │   └── page.tsx        # Page principale du mockup
│   └── ...
├── components/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   ├── ComparisonView.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── textarea.tsx
│       ├── tabs.tsx
│       ├── breadcrumb.tsx
│       ├── pagination.tsx
│       └── table.tsx
├── lib/
│   ├── fake-data.ts
│   └── utils.ts
├── styles/
│   └── globals.css
├── public/
├── app/layout.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .gitignore
```

## Si le port 3000 est occupé

```bash
npm run dev -- -p 3001
```

Puis accédez à: **http://localhost:3001/dashboard**

## Troubleshooting

### "next: command not found"
```bash
# Les dépendances ne sont pas installées
npm install
```

### Erreur 404 sur `/dashboard`
```bash
# Vérifiez que le serveur est bien lancé
npm run dev
# Et que vous accédez à http://localhost:3000/dashboard
```

### Problème de styles Tailwind
```bash
# Réinstallez les dépendances
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Fichiers clés

- `app/dashboard/page.tsx` : Point d'entrée du mockup
- `components/Navbar.tsx` : Barre de navigation
- `components/Sidebar.tsx` : Sidebar avec recherche et arborescence
- `components/ComparisonView.tsx` : Vue principale de comparaison
- `lib/fake-data.ts` : Données factices (8 exigences, 4 fournisseurs)

## Structure des données

Voir `lib/fake-data.ts` pour:
- `requirementsData` : Hiérarchie complète des exigences
- `suppliersData` : Liste des 4 fournisseurs
- `generateResponses()` : Génère 32 réponses (8 exigences × 4 fournisseurs)

## Modification des données

Pour ajouter/modifier des exigences, éditez `lib/fake-data.ts`:

```typescript
export const requirementsData: Requirement[] = [
  {
    id: "DOM-1",
    title: "Votre domaine",
    // ... autres champs
    children: [
      // Sous-éléments
    ]
  }
]
```

---

**Maintenant prêt à brainstormer sur l'UX et les améliorations!** 🎨

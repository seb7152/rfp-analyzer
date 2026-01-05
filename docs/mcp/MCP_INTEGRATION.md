# 🎯 OPTION 2 - MCP Intégré dans l'App Principale

**Date**: 2026-01-02  
**Structure**: Une seule app Next.js avec MCP intégré

---

## 📂 Nouvelle Structure

```
RFP-Analyzer/
├── app/
│   ├── (pages de l'app)
│   ├── api/
│   │   ├── mcp/
│   │   │   └── route.ts         ← 🚀 MCP Server ici
│   │   └── (autres routes API)
│   └── page.tsx
│
├── lib/
│   ├── mcp/                     ← MCP Utilities
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── pagination.ts
│   │   ├── tools/
│   │   └── services/
│   └── (rest of lib)
│
├── package.json                 ← UN SEUL
└── (rest of project)
```

---

## 🚀 Démarrage

C'est simple :

```bash
npm install
npm run dev
```

Et c'est tout ! Les deux services démarrent:

- **App principale** → http://localhost:3000
- **MCP Server** → http://localhost:3000/api/mcp (automatiquement)

---

## 🧪 Tester le MCP

Une fois `npm run dev` lancé:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

Tools disponibles:

- `test_connection` - Vérifier la connexion
- `get_rfps` - Lister les RFPs
- `get_requirements` - Exigences d'un RFP
- `list_suppliers` - Fournisseurs d'un RFP

---

## ✅ Avantages de cette approche

```
✅ Une seule commande: npm run dev
✅ Une seule app Next.js
✅ MCP démarre automatiquement
✅ Code partagé dans lib/mcp
✅ Un seul package.json
✅ Déploiement simple (une seule app)
```

---

## 📝 Fichiers Clés

| Fichier                       | Rôle                                   |
| ----------------------------- | -------------------------------------- |
| `app/api/mcp/route.ts`        | MCP Server - Enregistre tous les tools |
| `lib/mcp/utils/logger.ts`     | Logger structurisé                     |
| `lib/mcp/utils/pagination.ts` | Pagination système                     |
| `lib/mcp/tools/`              | Tools implémentation (à faire)         |
| `lib/mcp/services/`           | Services MCP (à faire)                 |

---

## 🚀 Prochaines Étapes

1. ✅ Intégration OPTION 2 (DONE)
2. ✅ Tools de base implémentés (DONE)
3. ⏳ Tests avec MCP Inspector
4. ⏳ Remplacer données mockées par Supabase réel
5. ⏳ Phase 1.3 - Requirements Resources avancées
6. ⏳ Phase 1.4 - Suppliers Resources avancées

---

**Créé**: 2026-01-02  
**Version**: 1.0

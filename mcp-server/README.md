# RFP Analyzer MCP Server

Serveur MCP (Model Context Protocol) pour la **consultation et analyse** des données RFP.

**Focus**: Permettre à Claude d'accéder aux RFPs, exigences, réponses, scores et générer des analyses comparatives.

## 📚 Documentation

- **[FEATURES_SUMMARY.md](./FEATURES_SUMMARY.md)** - Vue d'ensemble des fonctionnalités et cas d'usage
- **[SPECS.md](./SPECS.md)** - Spécifications techniques détaillées (Resources, Tools, formats)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagrammes d'architecture et flux de données
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Plan d'implémentation avec estimations

## 🚀 Démarrage Rapide

### 1. Installation

```bash
# Installer les dépendances
npm install

# Configuration environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials Supabase
```

### 2. Variables d'Environnement

Le serveur MCP utilise les mêmes variables Supabase que le projet principal :

```bash
# Copier depuis le projet principal :
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_here

# Optionnel : Clé service Supabase (côté serveur uniquement)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Environnement
NODE_ENV=development
```

**Note :** Pas besoin de nouvelles variables d'environnement ! Le serveur MCP réutilise directement la configuration Supabase existante.

### 3. Développement

```bash
npm run dev
```

Le serveur sera disponible sur : http://localhost:3000/api/mcp

### 4. Test avec MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

## 🏗️ Architecture

- **Next.js 14** avec App Router
- **MCP Handler** pour la communication avec les clients
- **Supabase** pour la base de données et authentification
- **Personal Access Tokens** pour la sécurité
- **TypeScript** pour la type safety

## 📋 Fonctionnalités

### ✅ Implémenté

#### Authentification
- `test_connection` - Test de connexion
- `create_personal_access_token` - Créer un PAT
- `list_my_tokens` - Lister ses tokens
- `revoke_token` - Révoquer un token

### 🔄 En Développement (Phase 1 & 2)

#### Resources (Accès Données)
- `rfp://list` - Liste des RFPs
- `rfp://{id}` - Détails d'un RFP
- `requirements://{rfp_id}/domain/{domain}` - Exigences par domaine
- `requirements://{requirement_id}` - Détails d'une exigence avec réponses
- `suppliers://{rfp_id}/list` - Liste des fournisseurs
- `responses://{rfp_id}/by-domain` - Réponses organisées par domaine

#### Tools (Analyse & Scores)
- `get_requirements_scores` - Notes et moyennes par exigence ⭐
- `get_scores_matrix` - Matrice de scores (tableau) ⭐
- `get_rfp_with_responses` - Consultation complète avec filtres
- `compare_suppliers` - Comparaison multi-fournisseurs
- `get_domain_analysis` - Analyse approfondie d'un domaine

#### Export
- `export_domain_responses` - Export JSON/Markdown/CSV
- `generate_comparison_report` - Rapports de comparaison

### 📋 Roadmap Future

- Recherche full-text avancée
- Analyse IA prédictive
- Webhooks temps réel
- API REST publique

## 🔐 Sécurité

### Personal Access Tokens (PAT)

- Tokens uniques et sécurisés
- Permissions granulaires par catégorie
- Expiration automatique
- Révocation instantanée

### Isolation Multi-tenant

- Row Level Security (RLS) sur toutes les tables
- Isolation par organisation
- Validation des permissions par rôle

## 🚀 Déploiement

### Vercel

```bash
# Déployer sur Vercel
npm install -g vercel
vercel login
vercel --prod
```

### Configuration Client

```json
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "https://votre-app.vercel.app/api/mcp",
      "headers": {
        "x-pat-token": "votre_token_pat",
        "x-organization-id": "votre_id_organisation"
      }
    }
  }
}
```

## 📊 Monitoring

Les logs sont disponibles dans :

- Console Vercel (production)
- Console développement (local)
- Table `mcp_audit_logs` (Supabase)

## 🔧 Développement

### Structure des fichiers

```
mcp-server/
├── app/api/mcp/[transport]/route.ts    # Serveur MCP principal
├── lib/
│   ├── supabase/client.ts              # Client Supabase
│   └── mcp/
│       ├── auth/
│       │   ├── tokens.ts              # Gestion PAT
│       │   └── middleware.ts          # Sécurité
│       └── tools/                    # Outils MCP
├── types/mcp.ts                        # Types MCP
├── supabase/migrations/               # Migrations DB
└── README.md
```

### Ajouter un nouvel outil

1. Créer un fichier dans `lib/mcp/tools/`
2. Implémenter la fonction avec `server.tool()`
3. Importer et enregistrer dans `route.ts`
4. Ajouter les permissions requises

---

## 💡 Exemples d'Utilisation

### Consulter les exigences d'un domaine

```typescript
// Via Resource
GET requirements://uuid-rfp/domain/Sécurité?include_responses=true

// Résultat: Toutes les exigences du domaine Sécurité avec les réponses de tous les fournisseurs
```

### Voir les notes de tous les fournisseurs

```typescript
// Via Tool
CALL get_requirements_scores({
  rfp_id: "uuid-rfp",
  filters: {
    domain_names: ["Sécurité"]
  },
  include_stats: true
})

// Résultat: Notes par fournisseur pour chaque exigence + moyennes, min, max, écart-type
```

### Obtenir une matrice de scores

```typescript
// Via Tool
CALL get_scores_matrix({
  rfp_id: "uuid-rfp",
  domain_name: "Infrastructure",
  limit: 50
})

// Résultat: Tableau [Requirements × Suppliers] avec totaux et classement
```

### Comparer des fournisseurs

```typescript
// Via Tool
CALL compare_suppliers({
  rfp_id: "uuid-rfp",
  supplier_ids: ["uuid-1", "uuid-2", "uuid-3"],
  scope: {
    type: "domain",
    domain_name: "Sécurité"
  },
  comparison_mode: "side_by_side"
})

// Résultat: Comparaison détaillée avec réponses côte à côte et analyse
```

Pour plus d'exemples et de cas d'usage, consultez **[FEATURES_SUMMARY.md](./FEATURES_SUMMARY.md)**.

---

## 🤝 Contribution

1. Consulter [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) pour les priorités
2. Lire [SPECS.md](./SPECS.md) pour les spécifications
3. Créer une branche feature
4. Ajouter des tests
5. Soumettre une PR

## 📝 License

MIT License - voir fichier LICENSE pour détails.

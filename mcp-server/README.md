# RFP Analyzer MCP Server

Serveur MCP (Model Context Protocol) pour la gestion collaborative des RFP.

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

## 📋 Outils Disponibles

### Authentification & Tokens

- `test_connection` - Test de connexion
- `create_personal_access_token` - Créer un PAT
- `list_my_tokens` - Lister ses tokens
- `revoke_token` - Révoquer un token

### TODO: Outils RFP à implémenter

#### Requirements Management

- `create_requirement` - Créer une exigence
- `update_requirement` - Modifier une exigence
- `delete_requirement` - Supprimer une exigence
- `list_requirements` - Lister les exigences

#### Suppliers Management

- `add_supplier` - Ajouter un fournisseur
- `update_supplier` - Modifier un fournisseur
- `remove_supplier` - Supprimer un fournisseur
- `list_suppliers` - Lister les fournisseurs

#### Responses Management

- `create_response` - Créer une réponse fournisseur
- `update_response` - Modifier une réponse
- `delete_response` - Supprimer une réponse
- `get_supplier_responses` - Voir les réponses d'un fournisseur

#### Comments & Notes

- `add_requirement_comment` - Commenter une exigence
- `add_rfp_note` - Ajouter une note RFP
- `get_comments` - Voir les commentaires

#### Scoring

- `score_requirement` - Noter une exigence
- `get_scores_summary` - Résumé des scores
- `calculate_supplier_scores` - Calculer scores finaux

#### Versions

- `create_version` - Créer une version
- `compare_versions` - Comparer des versions
- `switch_active_version` - Changer version active

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

## 📝 License

MIT License - voir fichier LICENSE pour détails.

# Spécifications : Serveur MCP avec Next.js, Vercel et Supabase

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Architecture](#architecture)
4. [Choix techniques](#choix-techniques)
5. [Structure du projet](#structure-du-projet)
6. [Installation et configuration](#installation-et-configuration)
7. [Implémentation des outils MCP](#implémentation-des-outils-mcp)
8. [Sécurité et authentification](#sécurité-et-authentification)
9. [Déploiement](#déploiement)
10. [Tests et validation](#tests-et-validation)
11. [Monitoring et maintenance](#monitoring-et-maintenance)
12. [Limites et optimisations](#limites-et-optimisations)

---

## Vue d'ensemble

### Qu'est-ce qu'un serveur MCP ?

Le **Model Context Protocol (MCP)** est un protocole standardisé développé par Anthropic qui permet aux modèles de langage (LLM) d'interagir avec des sources de données externes et des outils via une interface structurée.

Un serveur MCP expose des **outils** (tools) que les LLM peuvent découvrir et appeler de manière autonome pour accomplir des tâches spécifiques.

### Objectif de ce document

Ce document décrit comment implémenter un serveur MCP distant (remote MCP server) en utilisant :

- **Next.js** (App Router) comme framework
- **Vercel** comme plateforme de déploiement
- **Supabase** comme backend (base de données, auth, storage)

### Cas d'usage

Ce type d'architecture est idéal pour :

- Exposer des API internes à des assistants IA (Claude, Cursor, etc.)
- Automatiser des tâches métier via langage naturel
- Créer des interfaces conversationnelles pour vos applications
- Prototyper rapidement des agents IA

---

## Prérequis

### Compétences requises

- **TypeScript / JavaScript** : Niveau intermédiaire
- **Next.js** : Connaissance de l'App Router
- **API REST** : Compréhension des concepts de base
- **Supabase** : Notions de base (ou PostgreSQL)
- **Git** : Gestion de version

### Comptes et services

| Service                 | Plan minimum    | Coût | Utilisation               |
| ----------------------- | --------------- | ---- | ------------------------- |
| **Vercel**              | Hobby (gratuit) | 0€   | Hébergement serveur MCP   |
| **Supabase**            | Free tier       | 0€   | Base de données + Auth    |
| **Upstash** (optionnel) | Free tier       | 0€   | Redis pour SSE transport  |
| **GitHub**              | Free            | 0€   | Versioning et déploiement |

### Outils de développement

```bash
# Node.js 18+ requis
node --version  # >= 18.0.0

# Package manager (au choix)
npm --version   # ou
pnpm --version  # ou
bun --version
```

### Configuration locale

- **Éditeur** : VS Code, Cursor, ou équivalent
- **Terminal** : Bash, Zsh, ou PowerShell
- **Git** : Pour le versioning

---

## Architecture

### Schéma global

```
┌─────────────────┐
│   Client MCP    │  (Claude Desktop, Cursor, VS Code)
│  (LLM + UI)     │
└────────┬────────┘
         │ HTTP/HTTPS
         │ (Streamable HTTP ou SSE)
         ▼
┌─────────────────────────────────────────┐
│         Vercel (Edge Network)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Next.js App Router              │ │
│  │                                   │ │
│  │   /api/mcp/[transport]/route.ts  │ │
│  │   ├─ Vercel MCP Handler          │ │
│  │   ├─ Tool Definitions            │ │
│  │   └─ Business Logic              │ │
│  └──────────────┬────────────────────┘ │
└─────────────────┼───────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │  Services       │
│                 │  │  externes       │
│  • PostgreSQL   │  │  (APIs, etc.)   │
│  • Auth         │  │                 │
│  • Storage      │  │                 │
│  • Edge Funcs   │  │                 │
└─────────────────┘  └─────────────────┘
```

### Flux de communication

1. **Client → Serveur MCP** : Le client découvre les outils disponibles
2. **Client → Serveur MCP** : Le client appelle un outil avec des paramètres
3. **Serveur MCP → Supabase** : Le serveur récupère/modifie des données
4. **Serveur MCP → Client** : Le serveur retourne le résultat structuré
5. **Client → Utilisateur** : Le LLM présente le résultat en langage naturel

---

## Choix techniques

### Pourquoi Next.js ?

| Avantage        | Description                                   |
| --------------- | --------------------------------------------- |
| **App Router**  | Support natif des Route Handlers (API routes) |
| **TypeScript**  | Type safety pour les schémas MCP              |
| **Écosystème**  | Compatible avec Vercel MCP Handler            |
| **Performance** | Edge Functions et caching intégrés            |
| **DX**          | Hot reload, debugging facilité                |

### Pourquoi Vercel ?

| Avantage          | Description                                        |
| ----------------- | -------------------------------------------------- |
| **Fluid Compute** | 60s d'exécution sur plan gratuit (vs 10s standard) |
| **Déploiement**   | Automatique via Git push                           |
| **Edge Network**  | Latence minimale globalement                       |
| **Scalabilité**   | Auto-scaling sans configuration                    |
| **Coût**          | Plan Hobby gratuit suffisant pour dev/test         |

**Note importante** : Activer **Fluid Compute** est essentiel pour bénéficier de 60 secondes d'exécution au lieu de 10 secondes sur le plan gratuit.

### Pourquoi Supabase ?

| Avantage               | Description                           |
| ---------------------- | ------------------------------------- |
| **PostgreSQL**         | Base de données relationnelle robuste |
| **Row Level Security** | Sécurité native au niveau des données |
| **Auth intégrée**      | OAuth, JWT, sessions gérées           |
| **Edge Functions**     | Pour logique complexe (Python/Deno)   |
| **Real-time**          | Subscriptions WebSocket si besoin     |
| **Free tier**          | Généreux pour prototypage             |

### Transport : Streamable HTTP vs SSE

| Critère             | Streamable HTTP           | SSE                   |
| ------------------- | ------------------------- | --------------------- |
| **Connexions**      | Stateless (HTTP standard) | Stateful (persistent) |
| **Redis requis**    | ❌ Non                    | ✅ Oui                |
| **Performance**     | ⚡ Excellente             | ⚠️ Moyenne            |
| **Coût**            | 💰 Minimal                | 💰💰 Plus élevé       |
| **Support clients** | 🔄 En croissance          | ✅ Large              |
| **Recommandation**  | ✅ **Choix par défaut**   | ⚠️ Si client legacy   |

**Choix recommandé** : **Streamable HTTP** (plus moderne, plus efficace, pas de Redis)

---

## Structure du projet

### Arborescence complète

```
mon-projet-mcp/
├── app/
│   ├── api/
│   │   └── mcp/
│   │       └── [transport]/
│   │           └── route.ts          # ← Serveur MCP principal
│   └── layout.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Client Supabase
│   │   └── types.ts                  # Types générés
│   │
│   ├── mcp/
│   │   ├── tools/                    # Définitions des outils
│   │   │   ├── example-tool.ts
│   │   │   └── another-tool.ts
│   │   ├── schemas.ts                # Schémas Zod partagés
│   │   └── utils.ts                  # Utilitaires MCP
│   │
│   └── utils/
│       └── errors.ts                 # Gestion d'erreurs
│
├── types/
│   └── mcp.ts                        # Types TypeScript MCP
│
├── .env.local                        # Variables d'environnement
├── .env.example                      # Template des variables
├── vercel.json                       # Configuration Vercel
├── package.json
├── tsconfig.json
└── README.md
```

### Fichiers clés

#### `app/api/mcp/[transport]/route.ts`

Point d'entrée du serveur MCP. Gère les requêtes HTTP et configure les outils.

#### `lib/mcp/tools/`

Chaque fichier définit un outil MCP avec sa logique métier.

#### `lib/supabase/client.ts`

Client Supabase configuré avec gestion de l'authentification.

#### `vercel.json`

Configuration spécifique pour Fluid Compute et timeouts.

---

## Installation et configuration

### 1. Initialiser le projet Next.js

```bash
# Créer un nouveau projet
npx create-next-app@latest mon-projet-mcp --typescript --app --tailwind

cd mon-projet-mcp
```

### 2. Installer les dépendances MCP

```bash
# Package manager au choix
npm install mcp-handler @modelcontextprotocol/sdk zod

# Supabase
npm install @supabase/supabase-js

# Optionnel : validation et utilitaires
npm install zod-to-json-schema
```

### 3. Configuration Supabase

#### 3.1 Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anon

#### 3.2 Créer les variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Optionnel pour Redis (SSE)
REDIS_URL=redis://...
```

```bash
# .env.example (à commiter dans Git)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
REDIS_URL=optional_redis_url
```

### 4. Configuration Vercel

#### 4.1 Créer `vercel.json`

```json
{
  "functions": {
    "app/api/mcp/[transport]/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

**Notes** :

- `maxDuration: 60` fonctionne avec Fluid Compute (plan Hobby)
- `memory: 1024` est la valeur par défaut

#### 4.2 Activer Fluid Compute

1. Aller dans les paramètres du projet sur Vercel
2. Section "Functions"
3. Activer "Fluid Compute" (gratuit sur Hobby)

### 5. Configuration TypeScript

Aucune configuration spéciale requise. Le `tsconfig.json` par défaut de Next.js suffit.

---

## Implémentation des outils MCP

### Anatomie d'un outil MCP

Un outil MCP se compose de :

1. **Nom** : Identifiant unique (snake_case)
2. **Description** : Explication détaillée pour le LLM
3. **Schéma d'entrée** : Validation des paramètres (Zod)
4. **Handler** : Fonction asynchrone avec la logique métier

### Template de base

```typescript
// lib/mcp/tools/example-tool.ts
import { z } from "zod";
import type { McpServer } from "mcp-handler";
import { getSupabaseClient } from "@/lib/supabase/client";

export const registerExampleTool = (server: McpServer) => {
  server.tool(
    // 1. Nom de l'outil (snake_case)
    "example_tool",

    // 2. Description détaillée
    `Description complète de ce que fait l'outil.
    
    **Cas d'usage :**
    - Quand utiliser cet outil
    - Exemples de questions utilisateur
    - Situations appropriées
    
    **Retourne :**
    - Format des données retournées
    - Structure du résultat
    
    **Notes importantes :**
    - Limitations ou contraintes
    - Prérequis
    - Temps d'exécution estimé`,

    // 3. Schéma d'entrée (Zod)
    {
      param1: z
        .string()
        .describe(
          "Description détaillée du paramètre 1. Ex: 'valeur1', 'valeur2'"
        ),

      param2: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Description du paramètre 2. Optionnel, par défaut: 10"),

      param3: z
        .enum(["option1", "option2", "option3"])
        .default("option1")
        .describe("Choix parmi : option1, option2, option3"),
    },

    // 4. Handler asynchrone
    async ({ param1, param2, param3 }, { context }) => {
      try {
        // Accès à Supabase
        const supabase = getSupabaseClient(context?.authorization);

        // Logique métier
        const { data, error } = await supabase
          .from("table_name")
          .select("*")
          .eq("column", param1);

        if (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Erreur : ${error.message}`,
              },
            ],
            isError: true,
          };
        }

        // Formater la réponse pour le LLM
        return {
          content: [
            {
              type: "text",
              text: formatResponse(data),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur inattendue : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};

// Fonction helper pour formater
function formatResponse(data: any[]): string {
  if (!data || data.length === 0) {
    return "Aucun résultat trouvé.";
  }

  return (
    `📊 **${data.length} résultat(s) trouvé(s)**\n\n` +
    data
      .map((item, i) => `${i + 1}. ${item.name} - ${item.description}`)
      .join("\n")
  );
}
```

### Client Supabase avec authentification

```typescript
// lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const getSupabaseClient = (accessToken?: string) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : undefined
  );

  return supabase;
};
```

### Serveur MCP principal

```typescript
// app/api/mcp/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { registerExampleTool } from "@/lib/mcp/tools/example-tool";
import { registerAnotherTool } from "@/lib/mcp/tools/another-tool";

const handler = async (req: NextRequest) => {
  return createMcpHandler(
    (server) => {
      // Enregistrer tous les outils
      registerExampleTool(server);
      registerAnotherTool(server);
      // ... autres outils
    },

    // Configuration des capabilities
    {
      capabilities: {
        tools: {
          example_tool: {
            description: "Courte description pour la découverte",
          },
          another_tool: {
            description: "Autre outil disponible",
          },
        },
      },
    },

    // Options du handler
    {
      basePath: "/api/mcp",
      verboseLogs: process.env.NODE_ENV === "development",
      maxDuration: 60,

      // Redis optionnel pour SSE
      redisUrl: process.env.REDIS_URL,
    }
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
```

### Bonnes pratiques pour les descriptions

#### ✅ Description efficace

```typescript
`Recherche des éléments dans la base de données par critères multiples.

**Cas d'usage :**
- "Trouve tous les éléments actifs"
- "Cherche les éléments créés en 2024"
- "Liste les éléments avec le tag 'urgent'"

**Retourne :**
- ID et nom de chaque élément
- Statut et date de création
- Métadonnées associées

**Notes :**
- La recherche est insensible à la casse
- Maximum 100 résultats par requête
- Temps d'exécution : 2-5 secondes`;
```

#### ❌ Description inefficace

```typescript
"Cherche des choses dans la base"; // ❌ Trop vague
```

### Formatage des réponses

#### Format recommandé pour le LLM

```typescript
// Structuré et lisible
return {
  content: [
    {
      type: "text",
      text: `
📊 **Résultats de la recherche**

✅ Trouvé 3 éléments :

1. **Élément A**
   - Statut : Actif
   - Date : 2024-01-15
   - Description : Lorem ipsum

2. **Élément B**
   - Statut : En attente
   - Date : 2024-02-20
   - Description : Dolor sit amet

3. **Élément C**
   - Statut : Terminé
   - Date : 2024-03-10
   - Description : Consectetur adipiscing

💡 **Suggestion** : Utilise 'get_details' pour plus d'informations sur un élément spécifique.
    `,
    },
  ],
};
```

### Gestion des erreurs

```typescript
// Types d'erreurs à gérer
try {
  // Logique métier
} catch (error) {
  // 1. Erreur Supabase
  if (error.code === "PGRST116") {
    return {
      content: [
        {
          type: "text",
          text: "❌ Élément non trouvé. Vérifie l'ID.",
        },
      ],
      isError: true,
    };
  }

  // 2. Erreur de validation
  if (error instanceof z.ZodError) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Paramètres invalides : ${error.errors.map((e) => e.message).join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  // 3. Erreur générique
  return {
    content: [
      {
        type: "text",
        text: `❌ Erreur : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      },
    ],
    isError: true,
  };
}
```

---

## Sécurité et authentification

### Niveaux de sécurité

#### Niveau 1 : Développement (minimal)

```typescript
// Pas d'authentification - UNIQUEMENT pour dev local
const handler = async (req: NextRequest) => {
  return createMcpHandler(
    (server) => {
      // Outils ici
    },
    {
      /* config */
    }
  )(req);
};
```

⚠️ **Ne jamais déployer en production sans authentification**

#### Niveau 2 : API Key (simple)

```typescript
const handler = async (req: NextRequest) => {
  // Vérifier l'API key
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  return createMcpHandler(/* ... */)(req);
};
```

Configurer dans le client :

```json
{
  "mcpServers": {
    "mon-serveur": {
      "url": "https://mon-app.vercel.app/api/mcp",
      "headers": {
        "x-api-key": "votre_cle_secrete"
      }
    }
  }
}
```

#### Niveau 3 : OAuth 2.0 avec Supabase (recommandé production)

```typescript
import { getSupabaseClient } from "@/lib/supabase/client";

const handler = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseClient();

  // Valider le token JWT
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response("Invalid token", { status: 401 });
  }

  return createMcpHandler(
    (server) => {
      // Outils ici
    },
    {
      /* config */
    },
    {
      requestContext: {
        user,
        authorization: authHeader,
      },
    }
  )(req);
};
```

### Row Level Security (RLS) dans Supabase

```sql
-- Activer RLS sur une table
ALTER TABLE ma_table ENABLE ROW LEVEL SECURITY;

-- Politique : lecture uniquement par le propriétaire
CREATE POLICY "Users can view own records"
ON ma_table FOR SELECT
USING (auth.uid() = user_id);

-- Politique : écriture uniquement par le propriétaire
CREATE POLICY "Users can insert own records"
ON ma_table FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique : mise à jour uniquement par le propriétaire
CREATE POLICY "Users can update own records"
ON ma_table FOR UPDATE
USING (auth.uid() = user_id);
```

### Rate Limiting (optionnel)

```typescript
// Avec Upstash (gratuit)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

const handler = async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";

  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  // ... reste du code
};
```

### Variables d'environnement sensibles

```bash
# Sur Vercel Dashboard
# Settings > Environment Variables

# Production
MCP_API_KEY=secret_key_prod
SUPABASE_SERVICE_ROLE_KEY=secret_key_prod

# Preview (optionnel)
MCP_API_KEY=secret_key_preview

# Development
MCP_API_KEY=secret_key_dev
```

⚠️ **Ne jamais commiter de secrets dans Git**

---

## Déploiement

### 1. Configuration Git

```bash
# Initialiser le repository
git init
git add .
git commit -m "Initial commit: MCP server setup"

# Créer un repo GitHub
gh repo create mon-projet-mcp --public --source=. --remote=origin --push

# Ou manuellement sur github.com puis :
git remote add origin https://github.com/username/mon-projet-mcp.git
git push -u origin main
```

### 2. Déploiement sur Vercel

#### Via Dashboard

1. Aller sur [vercel.com](https://vercel.com)
2. "Add New..." → "Project"
3. Importer le repo GitHub
4. Framework Preset: **Next.js** (auto-détecté)
5. Ajouter les variables d'environnement
6. Cliquer "Deploy"

#### Via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Premier déploiement
vercel

# Déploiement production
vercel --prod
```

### 3. Configuration post-déploiement

#### Activer Fluid Compute

1. Dashboard Vercel → Projet → Settings
2. Functions → Fluid Compute → **Enable**
3. Redéployer si nécessaire

#### Vérifier les variables d'environnement

```bash
# Via CLI
vercel env ls

# Ajouter une variable
vercel env add MCP_API_KEY production
```

### 4. URL du serveur MCP

Après déploiement, ton URL sera :

```
https://ton-projet.vercel.app/api/mcp
```

Cette URL est à configurer dans tes clients MCP (Claude Desktop, Cursor, etc.)

---

## Tests et validation

### Test local avec MCP Inspector

```bash
# Lancer le serveur Next.js
npm run dev

# Dans un autre terminal, lancer l'inspector
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

L'inspector ouvre une interface web pour tester les outils interactivement.

### Test de production

```bash
# Tester avec l'URL de production
npx @modelcontextprotocol/inspector https://ton-projet.vercel.app/api/mcp
```

### Configuration des clients MCP

#### Claude Desktop

Fichier de configuration :

- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mon-serveur": {
      "url": "https://ton-projet.vercel.app/api/mcp"
    }
  }
}
```

Avec authentification :

```json
{
  "mcpServers": {
    "mon-serveur": {
      "url": "https://ton-projet.vercel.app/api/mcp",
      "headers": {
        "x-api-key": "votre_cle"
      }
    }
  }
}
```

#### Cursor

Fichier : `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "mon-serveur": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://ton-projet.vercel.app/api/mcp"]
    }
  }
}
```

#### VS Code (Copilot)

Fichier : `.vscode/mcp-servers.json`

```json
{
  "servers": {
    "mon-serveur": {
      "type": "http",
      "url": "https://ton-projet.vercel.app/api/mcp"
    }
  }
}
```

### Checklist de validation

- [ ] Le serveur répond sur `/api/mcp`
- [ ] MCP Inspector détecte tous les outils
- [ ] Chaque outil retourne des résultats valides
- [ ] Les erreurs sont gérées proprement
- [ ] L'authentification fonctionne (si configurée)
- [ ] Les logs sont lisibles dans Vercel Dashboard
- [ ] Le temps d'exécution est < 60s
- [ ] La mémoire utilisée est raisonnable

---

## Monitoring et maintenance

### Logs Vercel

```bash
# Voir les logs en temps réel
vercel logs

# Logs d'un déploiement spécifique
vercel logs [deployment-url]

# Filtrer par fonction
vercel logs --filter="api/mcp"
```

### Monitoring dans le code

```typescript
// lib/mcp/utils.ts
export function logToolCall(toolName: string, params: any, duration: number) {
  console.log(
    JSON.stringify({
      type: "mcp_tool_call",
      tool: toolName,
      params: sanitizeParams(params),
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  );
}

function sanitizeParams(params: any): any {
  // Retirer les données sensibles
  const { password, token, apiKey, ...safe } = params;
  return safe;
}
```

Utilisation :

```typescript
const start = Date.now();
try {
  const result = await doSomething();
  logToolCall("my_tool", params, Date.now() - start);
  return result;
} catch (error) {
  logToolCall("my_tool", params, Date.now() - start);
  throw error;
}
```

### Métriques Vercel

Dashboard → Analytics :

- **Function Invocations** : Nombre d'appels
- **Function Duration** : Temps d'exécution moyen
- **Function Errors** : Taux d'erreur
- **Bandwidth** : Bande passante utilisée

### Alertes (Vercel Pro)

Configurer des alertes pour :

- Temps d'exécution > 50s
- Taux d'erreur > 5%
- Bandwidth proche de la limite

### Maintenance régulière

#### Mensuel

- Vérifier les dépendances obsolètes : `npm outdated`
- Mettre à jour les packages : `npm update`
- Vérifier les logs d'erreur dans Vercel

#### Trimestriel

- Auditer la sécurité : `npm audit`
- Revoir les politiques RLS Supabase
- Analyser les performances (temps d'exécution)

#### Annuel

- Migration vers nouvelles versions majeures
- Optimisation des requêtes Supabase
- Revue complète de l'architecture

---

## Limites et optimisations

### Limites du plan Hobby (Vercel)

| Ressource          | Limite                 | Impact                               |
| ------------------ | ---------------------- | ------------------------------------ |
| **Durée max**      | 60s avec Fluid Compute | ✅ Suffisant pour la plupart des cas |
| **Mémoire**        | 1024 MB                | ✅ Largement suffisant               |
| **Bande passante** | 100 GB/mois            | ⚠️ Surveiller si trafic élevé        |
| **Invocations**    | Illimitées             | ✅ Pas de souci                      |
| **Projets**        | Illimités              | ✅ Parfait                           |

### Limites Supabase (Free tier)

| Ressource           | Limite     | Impact                        |
| ------------------- | ---------- | ----------------------------- |
| **Base de données** | 500 MB     | ⚠️ Suffisant pour prototypage |
| **Bande passante**  | 5 GB/mois  | ⚠️ Surveiller                 |
| **Storage**         | 1 GB       | ✅ OK pour petits fichiers    |
| **Auth users**      | 50,000 MAU | ✅ Largement suffisant        |

### Optimisations recommandées

#### 1. Caching avec Next.js

```typescript
import { unstable_cache } from "next/cache";

// Cache les résultats pendant 1 heure
const getCachedData = unstable_cache(
  async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("table").select("*");
    return data;
  },
  ["data-cache"],
  { revalidate: 3600 } // 1 heure
);
```

#### 2. Pagination pour grandes requêtes

```typescript
async function getPaginatedData(page: number = 1, pageSize: number = 50) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("table")
    .select("*", { count: "exact" })
    .range(from, to);

  return {
    data,
    page,
    pageSize,
    total: count,
    hasMore: to < (count || 0),
  };
}
```

#### 3. Sélection de colonnes spécifiques

```typescript
// ❌ Éviter
const { data } = await supabase.from("table").select("*");

// ✅ Mieux
const { data } = await supabase.from("table").select("id, name, created_at");
```

#### 4. Index Supabase pour performance

```sql
-- Créer un index sur les colonnes fréquemment utilisées
CREATE INDEX idx_table_column ON table(column);

-- Index composite pour requêtes multi-colonnes
CREATE INDEX idx_table_col1_col2 ON table(col1, col2);
```

#### 5. Compression des réponses

```typescript
// Activer automatiquement avec Vercel
// Pas de configuration nécessaire pour Next.js
```

### Quand migrer vers un plan payant ?

**Vercel Pro (20$/mois)** si :

- Bande passante > 100 GB/mois
- Besoin de timeouts > 60s
- Équipe collaborative
- Besoin d'analytics avancées

**Supabase Pro (25$/mois)** si :

- Base de données > 500 MB
- Bande passante > 5 GB/mois
- Besoin de backups automatiques
- Support prioritaire requis

---

## Annexes

### Ressources officielles

- [MCP Specification](https://modelcontextprotocol.io/docs/specification)
- [Vercel MCP Handler](https://github.com/vercel/mcp-handler)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Templates et exemples

- [Next.js MCP Template (Vercel)](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Supabase MCP Examples](https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite)

### Communauté

- [MCP Discord](https://discord.gg/modelcontextprotocol)
- [Anthropic Community](https://community.anthropic.com)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Supabase Discord](https://discord.supabase.com)

### Outils recommandés

- **MCP Inspector** : Test et debug de serveurs MCP
- **Postman/Insomnia** : Test des endpoints HTTP
- **Supabase Studio** : Interface admin PostgreSQL
- **Vercel CLI** : Déploiement et gestion depuis le terminal

---

## Glossaire

| Terme               | Définition                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| **MCP**             | Model Context Protocol - Protocole standardisé pour communication LLM ↔ outils |
| **Tool**            | Fonction exposée par le serveur MCP, appelable par le LLM                       |
| **Capabilities**    | Métadonnées décrivant les fonctionnalités du serveur                            |
| **Transport**       | Méthode de communication (HTTP, SSE, stdio)                                     |
| **Fluid Compute**   | Mode d'exécution Vercel optimisé pour IA (durées longues)                       |
| **RLS**             | Row Level Security - Sécurité au niveau des lignes dans PostgreSQL              |
| **Edge Function**   | Fonction exécutée sur le edge network (proche des utilisateurs)                 |
| **Streamable HTTP** | Protocole HTTP moderne pour MCP (remplace SSE)                                  |
| **SSE**             | Server-Sent Events - Protocole MCP legacy (stateful)                            |

---

## Changelog

| Version | Date       | Modifications    |
| ------- | ---------- | ---------------- |
| 1.0.0   | 2024-11-29 | Version initiale |

---

## Licence

Ce document est fourni "tel quel" sans garantie. Libre d'utilisation et de modification.

---

## Support

Pour questions ou problèmes :

1. Consulter la documentation officielle MCP
2. Vérifier les issues GitHub du projet
3. Poser des questions sur les forums communautaires

---

**Dernière mise à jour** : 29 novembre 2024

# Résultats du Test de Migration MCP vers mcp-handler

**Date:** 2026-02-24
**Branche de test:** `feature/mcp-handler-migration`
**Objectif:** Évaluer la faisabilité de migrer l'implémentation manuelle MCP vers `mcp-handler` + SDK officiel

---

## 📋 Résumé Exécutif

**Verdict: ❌ Migration NON RECOMMANDÉE pour le moment**

La migration vers `mcp-handler` présente un **blocage critique** de compatibilité de versions qui rend l'approche problématique pour une utilisation en production.

---

## 🔍 Découvertes Critiques

### 1. 🚨 Conflit de Version SDK (BLOQUANT)

**Problème:**

- `mcp-handler@1.0.7` (latest) requiert **EXACTEMENT** `@modelcontextprotocol/sdk@1.25.2`
- La version `1.25.1` a une **vulnérabilité de fuite de données** (corrigée en v1.26.0)
- La version latest du SDK est `1.27.0` (16 février 2026)

**Impact:**

```bash
npm install mcp-handler@latest @modelcontextprotocol/sdk@^1.27.0
# ❌ ERREUR: ERESOLVE unable to resolve dependency tree
# peer @modelcontextprotocol/sdk@"1.25.2" from mcp-handler@1.0.7
```

**Tentative de résolution:**

```bash
npm install --legacy-peer-deps
# ✅ Installation réussie MAIS avec risques
```

**Conséquences:**

- Impossibilité d'utiliser la dernière version sécurisée du SDK (v1.27.0)
- Obligation d'utiliser v1.25.2 (pas de fix des améliorations post-1.26.0)
- Installation avec `--legacy-peer-deps` = configuration fragile et non recommandée
- Risque de comportements imprévisibles en production

### 2. 📊 État des Versions

| Package                     | Version Latest                | Version Requise par mcp-handler | Status                   |
| --------------------------- | ----------------------------- | ------------------------------- | ------------------------ |
| `@modelcontextprotocol/sdk` | 1.27.0 (Feb 2026)             | **1.25.2 EXACT**                | ❌ Incompatible          |
| `mcp-handler`               | 1.0.7                         | N/A                             | ✅ Latest                |
| `mcp-handler` (snapshot)    | 0.0.0-7a941a0f-20260220182431 | **1.25.2 EXACT**                | ❌ Toujours incompatible |

**Observation:** Même le snapshot le plus récent (20 février 2026) n'a pas mis à jour la dépendance vers une version plus récente du SDK.

---

## ✅ Ce Qui Fonctionne

### 1. Code de Migration Créé

La nouvelle route `/api/mcp-v2/route.ts` a été créée avec succès:

- ✅ Utilise `createMcpHandler()` de `mcp-handler`
- ✅ Utilise `McpServer` et `registerTool()` du SDK officiel
- ✅ Réutilise toute la logique business existante (pas de réécriture)
- ✅ Inclut `outputSchema` pour chaque outil
- ✅ Inclut `annotations` (readOnlyHint, destructiveHint, etc.)
- ✅ Retourne `structuredContent` en plus de `content`

### 2. Avantages Théoriques de l'Approche SDK

Si la migration était possible, les bénéfices seraient:

- ✅ Type safety automatique avec TypeScript
- ✅ Validation Zod automatique
- ✅ `structuredContent` natif pour données structurées
- ✅ `outputSchema` pour documentation auto-générée
- ✅ Annotations d'outils intégrées
- ✅ Gestion automatique des sessions
- ✅ OAuth support (via mcp-handler)
- ✅ Code plus concis et maintenable

---

## ❌ Problèmes Rencontrés

### 1. **Conflit de Dépendances** (CRITIQUE)

- `npm install` échoue sans `--legacy-peer-deps`
- `--legacy-peer-deps` est une solution de contournement fragile

### 2. **Verrou de Version**

- Impossible d'utiliser SDK v1.27.0 (latest)
- Bloqué à v1.25.2 (pas de features post-1.26.0)
- Pas de fix des améliorations récentes du SDK

### 3. **Risques de Production**

- Configuration non standard (`--legacy-peer-deps`)
- Comportements potentiellement imprévisibles
- Mises à jour futures difficiles

### 4. **Maintenance de mcp-handler**

- La dernière version (1.0.7) date de plusieurs semaines
- Le snapshot récent (20 fév 2026) n'a pas mis à jour la dépendance SDK
- Question: Vercel maintient-il activement ce package?

---

## 🔄 Comparaison des Approches

### Option A: Implémentation Manuelle (ACTUELLE)

**Avantages:**

- ✅ **Fonctionne parfaitement** sans problèmes
- ✅ **Contrôle total** du code
- ✅ **Pas de dépendances externes** problématiques
- ✅ **SDK à jour** (v1.27.0 sur main)
- ✅ **Stable en production**
- ✅ **Facile à débugger** et comprendre
- ✅ **Pas de risques** de breaking changes tiers

**Inconvénients:**

- ❌ Code plus verbeux (but clear)
- ❌ Pas de `structuredContent` automatique
- ❌ Pas de `outputSchema` auto-généré
- ❌ Maintenance manuelle du JSON-RPC 2.0

### Option B: mcp-handler + SDK (TESTÉ)

**Avantages:**

- ✅ Code plus concis
- ✅ Features SDK (structured content, schemas)
- ✅ Annotations intégrées
- ✅ Support OAuth théorique

**Inconvénients:**

- ❌ **BLOQUANT: Conflit de version SDK**
- ❌ Nécessite `--legacy-peer-deps` (fragile)
- ❌ Bloqué à SDK v1.25.2 (pas latest)
- ❌ Dépendance à package tiers (mcp-handler)
- ❌ Risques de breaking changes futurs
- ❌ Maintenance incertaine de mcp-handler

---

## 📝 Recommandations

### ✅ RECOMMANDATION FINALE: Rester sur l'Implémentation Manuelle

**Justification:**

1. **Stabilité Prouvée:** L'implémentation actuelle fonctionne parfaitement
2. **Contrôle Total:** Pas de dépendance à des packages tiers problématiques
3. **SDK à Jour:** Possibilité d'utiliser la dernière version sécurisée (v1.27.0)
4. **Production Ready:** Configuration standard sans `--legacy-peer-deps`
5. **Maintenabilité:** Code sous votre contrôle

### 🔧 Améliorations Possibles sans Migration

Au lieu de migrer vers `mcp-handler`, vous pouvez améliorer l'implémentation actuelle:

1. **Ajouter préfixes de service** aux noms d'outils:
   - `get_rfps` → `rfp_get_rfps`
   - `list_suppliers` → `rfp_list_suppliers`
   - **Effort:** 1-2h | **Risque:** Faible (breaking change pour clients)

2. **Ajouter annotations dans les définitions d'outils:**

   ```typescript
   {
     name: "rfp_get_rfps",
     annotations: {
       readOnlyHint: true,
       destructiveHint: false,
       idempotentHint: true,
       openWorldHint: false
     }
   }
   ```

   - **Effort:** 1h | **Risque:** Aucun (metadata uniquement)

3. **Définir outputSchema dans TOOL_DEFINITIONS:**

   ```typescript
   {
     name: "rfp_get_rfps",
     inputSchema: { ... },
     outputSchema: {  // ⭐ Nouveau
       type: "object",
       properties: {
         items: { type: "array", items: { ... } },
         pagination: { type: "object", properties: { ... } }
       }
     }
   }
   ```

   - **Effort:** 2-3h | **Risque:** Aucun (metadata uniquement)

4. **Implémenter structuredContent manuellement:**

   ```typescript
   return {
     jsonrpc: "2.0",
     id,
     result: {
       content: [
         {
           type: "text",
           text: JSON.stringify(result, null, 2),
         },
       ],
       _meta: {
         // Extension custom
         structured: result, // Données structurées
       },
     },
   };
   ```

   - **Effort:** 30min | **Risque:** Aucun (extension custom)

5. **Support format Markdown:**
   - Ajouter paramètre `response_format: "json" | "markdown"`
   - Créer formatters dans `lib/mcp/utils/formatters.ts`
   - **Effort:** 1 jour | **Risque:** Faible

---

## 🎯 Actions Recommandées

### Phase 1 (FAIT ✅): Mise à Jour Sécurité

- ✅ SDK mis à jour vers v1.27.0 sur branche `main`
- ✅ Commit: `security: update @modelcontextprotocol/sdk to v1.27.0`

### Phase 2 (À FAIRE): Améliorations Incrémentales sur Main

1. Ajouter préfixes `rfp_` aux noms d'outils (2-3h)
2. Ajouter annotations aux outils (1h)
3. Définir outputSchema pour chaque outil (2-3h)
4. [Optionnel] Support format Markdown (1 jour)

**Effort total:** 1-2 jours
**Risques:** Faibles
**Bénéfices:** Conformité MCP + Stabilité maintenue

### Phase 3 (NE PAS FAIRE ❌): Migration mcp-handler

- ❌ Ne pas merger la branche `feature/mcp-handler-migration`
- ❌ Ne pas utiliser `mcp-handler` tant que le conflit de version persiste
- 🔄 Réévaluer dans 2-3 mois si nouvelle version de `mcp-handler` corrige le problème

---

## 📊 Métriques de Décision

| Critère               | Implémentation Manuelle | mcp-handler + SDK           |
| --------------------- | ----------------------- | --------------------------- |
| **Stabilité**         | ⭐⭐⭐⭐⭐              | ⭐⭐                        |
| **Maintenabilité**    | ⭐⭐⭐⭐                | ⭐⭐⭐⭐⭐ (si ça marchait) |
| **Risques**           | ⭐⭐⭐⭐⭐ (aucun)      | ⭐ (élevés)                 |
| **Features MCP**      | ⭐⭐⭐                  | ⭐⭐⭐⭐⭐                  |
| **Compatibilité SDK** | ⭐⭐⭐⭐⭐ (v1.27.0)    | ⭐ (bloqué v1.25.2)         |
| **Production Ready**  | ⭐⭐⭐⭐⭐              | ⭐⭐                        |

**Score Total:**

- **Implémentation Manuelle:** 26/30 (87%)
- **mcp-handler + SDK:** 16/30 (53%)

---

## 🔗 Références

- Issue GitHub: [MCP SDK + Next.js Integration #407](https://github.com/modelcontextprotocol/typescript-sdk/issues/407) (Fermé - résolu par mcp-handler)
- Package: [mcp-handler on npm](https://www.npmjs.com/package/mcp-handler)
- SDK: [MCP TypeScript SDK Releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- Vercel: [Next.js MCP Guide](https://nextjs.org/docs/app/guides/mcp)

---

## ✍️ Conclusion

La migration vers `mcp-handler` est **techniquement possible** mais **non recommandée en production** en raison du conflit critique de version SDK. L'implémentation manuelle actuelle reste la **meilleure option** pour:

- ✅ Stabilité et fiabilité
- ✅ Contrôle et transparence
- ✅ Mise à jour facile du SDK
- ✅ Aucun risque de breaking changes tiers

Les améliorations MCP (préfixes, annotations, schemas) peuvent être intégrées **sans migration**, offrant le meilleur des deux mondes: conformité MCP + stabilité de l'implémentation manuelle.

**Prochaine étape:** Implémenter les améliorations incrémentales sur la branche `main` (effort: 1-2 jours).

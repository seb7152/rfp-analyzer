# Vertex AI Search - Customisation du Prompt de Résumé

## ❌ PAS de System Prompt Direct

**Important** : Vertex AI Search (Discovery Engine) **ne permet PAS** d'envoyer un system prompt personnalisé directement. Le système de génération de résumé est géré en interne par Google et utilise un modèle LLM propriétaire.

Tu ne peux **PAS** faire quelque chose comme :
```javascript
// ❌ IMPOSSIBLE
{
  systemPrompt: "Tu es un assistant qui analyse des RFPs...",
  query: "Quel est le planning ?"
}
```

## ✅ Paramètres de Contrôle Disponibles

### 1. `summarySpec` - Configuration du Résumé

Voici les paramètres que tu **PEUX** contrôler :

```javascript
contentSearchSpec: {
  summarySpec: {
    summaryResultCount: 5,           // Nombre de documents sources pour le résumé
    includeCitations: true,          // Inclure les citations [1], [2]
    ignoreAdversarialQuery: true,    // Ignorer les queries malveillantes
    ignoreNonSummarySeekingQuery: true, // Ignorer les queries non-informatives
    modelPromptSpec: {               // ✅ NOUVEAU : Contrôle indirect du prompt
      preamble: "Custom preamble text here"
    },
    modelSpec: {                     // Sélection du modèle
      version: "stable" | "preview"  // "stable" recommandé pour production
    }
  }
}
```

### 2. `modelPromptSpec.preamble` - **Le Seul Contrôle Indirect**

C'est le **SEUL** moyen d'influencer le comportement du LLM de génération de résumé.

**Documentation officielle** :
> "The preamble is prepended to the user query before the LLM is prompted to generate a summary. Use it to provide additional context or instructions."

**Exemple d'utilisation** :

```javascript
contentSearchSpec: {
  summarySpec: {
    summaryResultCount: 5,
    includeCitations: true,
    modelPromptSpec: {
      preamble: `Vous êtes un assistant spécialisé dans l'analyse de réponses fournisseurs pour des appels d'offres (RFPs).

Contexte : Les documents analysés sont des réponses fournisseurs à un appel d'offres.

Instructions :
- Répondez de manière concise et factuelle
- Citez systématiquement vos sources avec [1], [2], etc.
- Comparez les propositions des différents fournisseurs quand pertinent
- Mettez en évidence les différences clés entre les offres
- Structurez votre réponse avec des titres markdown (##, ###)

Format de réponse attendu :
## Synthèse
[Résumé général]

## Points clés par fournisseur
- **Fournisseur A** : [points]
- **Fournisseur B** : [points]

## Différences notables
[Comparaison]`
    }
  }
}
```

### 3. `queryExpansionSpec` - Expansion de la Query

Contrôle comment Vertex AI reformule/étend la question :

```javascript
queryExpansionSpec: {
  condition: "AUTO" | "DISABLED"
}
```

- `AUTO` : Vertex AI reformule automatiquement la query pour améliorer les résultats
- `DISABLED` : Utilise la query exacte sans reformulation

**Exemple** :
- Query originale : "planning"
- Avec `AUTO` : Vertex AI cherche aussi "schedule", "timeline", "roadmap", etc.

### 4. `spellCorrectionSpec` - Correction Orthographique

```javascript
spellCorrectionSpec: {
  mode: "AUTO" | "SUGGESTION_ONLY"
}
```

- `AUTO` : Corrige automatiquement les fautes
- `SUGGESTION_ONLY` : Suggère les corrections sans appliquer

## 📝 Implémentation Actuelle

**Fichier** : `app/api/rfps/[rfpId]/vertex-search/route.ts`

```typescript
const requestBody = {
  query,
  pageSize: Number(pageSize),
  filter, // Native filtering par rfp_id et supplier_id
  queryExpansionSpec: { condition: "AUTO" },
  spellCorrectionSpec: { mode: "AUTO" },
  contentSearchSpec: {
    summarySpec: {
      summaryResultCount: Number(summaryResultCount),
      includeCitations: true,
      ignoreAdversarialQuery: true,
      ignoreNonSummarySeekingQuery: true,
      // ⚠️ Pas de modelPromptSpec.preamble actuellement
    },
    extractiveContentSpec: {
      maxExtractiveAnswerCount: 3, // Extraits de texte par document
    },
  },
};
```

## 🎯 Recommandations pour Ajouter un Preamble

### Option 1 : Preamble Générique (Recommandé pour MVP)

```typescript
modelPromptSpec: {
  preamble: `Vous êtes un assistant d'analyse de réponses fournisseurs pour des appels d'offres.

Instructions :
- Répondez de manière concise et structurée
- Citez vos sources avec [1], [2], etc.
- Comparez les propositions quand plusieurs fournisseurs sont analysés
- Utilisez des titres markdown pour structurer votre réponse`
}
```

**Avantages** :
- Simple
- Fonctionne pour toutes les questions
- Améliore la structure des réponses

### Option 2 : Preamble Dynamique (Avancé)

Générer un preamble différent selon le contexte :

```typescript
function generatePreamble(supplierIds: string[], supplierNames: Map<string, string>) {
  const isMultiSupplier = supplierIds.length > 1;
  const supplierList = Array.from(supplierNames.values()).join(", ");

  if (isMultiSupplier) {
    return `Vous analysez les réponses de ${supplierIds.length} fournisseurs : ${supplierList}.

Instructions :
- Comparez systématiquement les propositions
- Mettez en évidence les différences clés
- Structurez par fournisseur puis par thème`;
  } else {
    return `Vous analysez la réponse du fournisseur ${supplierList}.

Instructions :
- Focalisez-vous sur les détails de cette proposition
- Identifiez les points forts et points d'attention`;
  }
}
```

### Option 3 : Preamble Basé sur le Type de Question

```typescript
function generateContextualPreamble(query: string) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("planning") || lowerQuery.includes("délai")) {
    return `Contexte : Cette question porte sur le planning et les délais.

Instructions :
- Identifiez les dates clés et jalons
- Comparez les durées proposées
- Relevez les dépendances temporelles`;
  }

  if (lowerQuery.includes("prix") || lowerQuery.includes("coût") || lowerQuery.includes("budget")) {
    return `Contexte : Cette question porte sur les aspects financiers.

Instructions :
- Extrayez les montants précis
- Comparez les structures tarifaires
- Identifiez les coûts cachés ou optionnels`;
  }

  // Preamble par défaut
  return `Vous êtes un assistant d'analyse de réponses fournisseurs.

Instructions :
- Répondez de manière factuelle
- Citez vos sources
- Structurez votre réponse clairement`;
}
```

## 🔧 Comment Implémenter

### Modification dans `vertex-search/route.ts`

```typescript
// Avant la requête Vertex AI (ligne ~210)

const preamble = `Vous êtes un assistant spécialisé dans l'analyse de réponses fournisseurs pour des appels d'offres.

Instructions :
- Répondez de manière concise et structurée avec des titres markdown
- Citez systématiquement vos sources avec [1], [2], etc.
- ${activeSupplierIds.length > 1 ? "Comparez les propositions des différents fournisseurs" : "Analysez en détail la proposition du fournisseur"}
- Mettez en évidence les points clés et différences notables`;

const requestBody = {
  query,
  pageSize: Number(pageSize),
  filter,
  queryExpansionSpec: { condition: "AUTO" },
  spellCorrectionSpec: { mode: "AUTO" },
  contentSearchSpec: {
    summarySpec: {
      summaryResultCount: Number(summaryResultCount),
      includeCitations: true,
      ignoreAdversarialQuery: true,
      ignoreNonSummarySeekingQuery: true,
      modelPromptSpec: {
        preamble, // ✅ AJOUT DU PREAMBLE
      },
    },
    extractiveContentSpec: {
      maxExtractiveAnswerCount: 3,
    },
  },
};
```

## ⚠️ Limitations du Preamble

1. **Longueur limitée** : Pas de limite officielle documentée, mais garder < 500 caractères recommandé
2. **Pas de garantie d'exécution** : Le LLM peut ignorer certaines instructions si contraires à son training
3. **Pas de variables dynamiques** : Le preamble est statique, pas de `{{supplierName}}` ou autre templating
4. **Langue** : Fonctionne en français ET en anglais (le modèle est multilingue)

## 📊 Impact Attendu

**Avec preamble bien conçu** :
- ✅ Réponses plus structurées (titres, listes)
- ✅ Meilleure comparaison multi-fournisseurs
- ✅ Citations plus systématiques
- ✅ Ton plus adapté au contexte RFP

**Sans preamble** :
- ❌ Réponses parfois trop génériques
- ❌ Structure variable
- ❌ Comparaisons moins systématiques

## 🧪 Test du Preamble

Pour tester l'impact du preamble :

1. Faire une recherche AVEC preamble
2. Faire la même recherche SANS preamble
3. Comparer :
   - Structure du résumé
   - Présence de comparaisons
   - Ton de la réponse
   - Densité des citations

**Exemple de test** :

```bash
# Query de test
"Quel est le planning proposé par les fournisseurs ?"

# Avec preamble optimisé
→ Réponse attendue : Tableau comparatif, dates précises, jalons clés

# Sans preamble
→ Réponse attendue : Texte générique, moins structuré
```

## 🔗 Références

- [Vertex AI Search - Search API](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/projects.locations.collections.engines.servingConfigs/search)
- [SummarySpec Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/SearchRequest#SummarySpec)
- [ModelPromptSpec](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/SearchRequest#ModelPromptSpec)

## 💡 Prochaines Étapes

1. **MVP** : Ajouter un preamble générique simple
2. **V2** : Preamble dynamique selon nombre de fournisseurs
3. **V3** : Preamble contextuel selon type de question
4. **V4** : Configuration utilisateur du preamble (admin settings)

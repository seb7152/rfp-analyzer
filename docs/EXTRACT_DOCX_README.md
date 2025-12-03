# API Extract DOCX - Résumé complet

## 📋 Qu'est-ce qui a été créé?

Une API Next.js (Vercel compatible) qui remplace la Supabase Edge Function pour extraire les requirements des fichiers DOCX.

### Améliorations par rapport à l'Edge Function Deno

✅ **Meilleure gestion des tables** - Utilise `docx-parser` qui parse correctement les cellules
✅ **Pas de limite de librairie** - Accès complet à npm
✅ **Transformation de code avancée** - Support des chaînes de transformations
✅ **Moins de limitations** - Vercel a des quotas généreux
✅ **Intégration Next.js native** - Zero configuration
✅ **Debugging facile** - Logs Vercel intégrés
✅ **Déploiement automatique** - Via GitHub

---

## 📁 Fichiers créés

```
app/api/extract-docx/route.ts
├─ Endpoint POST /api/extract-docx
├─ Parsing DOCX avec docx-parser
├─ Extraction des requirements
├─ Support des transformations
└─ Gestion des erreurs

app/components/docx-extractor.tsx
├─ Composant React réutilisable
├─ Upload de fichier
├─ Configuration des patterns
└─ Affichage du loading

types/docx-parser.d.ts
└─ Déclarations TypeScript pour docx-parser

docs/
├─ EXTRACT_DOCX_API.md (API documentation)
├─ EXTRACT_DOCX_EXAMPLES.md (Exemples d'utilisation)
├─ EXTRACT_DOCX_DEPLOYMENT.md (Déploiement Vercel)
└─ EXTRACT_DOCX_README.md (ce fichier)
```

---

## 🚀 Utilisation rapide

### 1. Via curl

```bash
curl -X POST http://localhost:3000/api/extract-docx \
  -F "file=@requirements.docx" \
  -F "requirementConfig={\"capturePattern\":\"REQ-([0-9]+)\"}"
```

### 2. Via React

```typescript
import { DocxExtractor } from "@/app/components/docx-extractor";

export default function Page() {
  return (
    <DocxExtractor onExtract={(sections) => {
      const requirements = sections.flatMap(s => s.requirements);
      console.log(requirements);
    }} />
  );
}
```

### 3. Avec TypeScript

```typescript
interface RequirementConfig {
  capturePattern?: string;        // Regex pour matcher
  codeTemplate?: string;          // Format du code (ex: REQ-$1:padStart(2,0))
  captureGroupIndex?: number;     // Index du groupe (défaut: 1)
  titleExtraction?: {
    type: "inline" | "table";
    pattern?: string;
    groupIndex?: number;
    columnIndex?: number;
  };
  contentExtraction?: {
    type: "inline" | "table";
    pattern?: string;
    groupIndex?: number;
    columnIndex?: number;
  };
}

const response = await fetch("/api/extract-docx", {
  method: "POST",
  body: formData,
});

const { structured } = await response.json();
```

---

## 🔧 Configuration des Requirements

### Cas simple - Juste matcher un pattern

```json
{
  "capturePattern": "REQ-([0-9]+)"
}
```

### Avec transformation de code

```json
{
  "capturePattern": "Req\\s*([0-9]+)",
  "codeTemplate": "REQ-$1:padStart(3,0):toUpperCase()"
}
```

Transformations disponibles:
- `padStart(length, char)` - Remplir au début
- `toUpperCase()` - Majuscules
- `toLowerCase()` - Minuscules
- `replace(pattern, replacement)` - Remplacer avec regex

### Avec extraction de titre et contenu

```json
{
  "capturePattern": "REQ-([0-9]+)",
  "codeTemplate": "REQ-$1:padStart(2,0)",
  "titleExtraction": {
    "type": "inline",
    "pattern": "REQ-[0-9]+\\s*[-:]\\s*([^\\n:]+?)\\s*[-:]",
    "groupIndex": 1
  },
  "contentExtraction": {
    "type": "inline",
    "pattern": "REQ-[0-9]+(?:\\s*[-:]\\s*[^\\n:]+?)?\\s*[-:]\\s*(.+?)$",
    "groupIndex": 1
  }
}
```

### Depuis une table

```json
{
  "capturePattern": "^[A-Z]+-[0-9]+$",
  "titleExtraction": {
    "type": "table",
    "columnIndex": 0
  },
  "contentExtraction": {
    "type": "table",
    "columnIndex": 2
  }
}
```

---

## 📊 Structure de réponse

```json
{
  "success": true,
  "structured": [
    {
      "level": 1,
      "title": "Section Title",
      "content": ["Paragraph 1", "Paragraph 2"],
      "tables": [
        ["Cell 1", "Cell 2"],
        ["Cell 3", "Cell 4"]
      ],
      "requirements": [
        {
          "code": "REQ-01",
          "originalCapture": "REQ-1",
          "title": "Optional title",
          "content": "Optional content"
        }
      ]
    }
  ]
}
```

---

## 🌐 Déploiement Vercel

### Automatique (recommandé)

```bash
# Push sur main
git push origin main

# Vercel déploie automatiquement
# URL: https://your-project.vercel.app/api/extract-docx
```

### Manuel

```bash
vercel --prod
```

### Variables d'environnement

Aucune requise pour le moment. Ajouter si besoin:
- Intégrations Supabase
- Clés API externes
- Configuration personnalisée

### Limitations Vercel

| Plan | Timeout | Max file | Cold start |
|------|---------|----------|-----------|
| Free | 10s | 4.5 MB | ~1s |
| Pro | 60s | 4.5 MB | ~0.5s |

---

## ✅ Tests

### Test local

```bash
cd /Users/seb7152/Documents/RFP\ analyzer/RFP-Analyer

# Dev server
npm run dev

# Type check
npm run type-check

# Test endpoint
curl -X POST http://localhost:3000/api/extract-docx \
  -F "file=@test.docx"
```

### Test production

```bash
# Via Vercel
curl -X POST https://your-project.vercel.app/api/extract-docx \
  -F "file=@test.docx"

# Vérifier les logs
vercel logs --prod
```

---

## 🐛 Troubleshooting

### "Could not find declaration file for docx-parser"

**Solution:** `types/docx-parser.d.ts` a été créé automatiquement.

### Regex pattern ne matcher pas

**Test:** Utiliser un regex tester online
- https://regex101.com/
- https://regexpal.com/

```javascript
// Tester localement
const pattern = new RegExp("REQ-([0-9]+)", "g");
const match = pattern.exec("REQ-001: My requirement");
console.log(match[1]); // "001"
```

### Fichier trop gros

**Options:**
1. Réduire la taille du fichier
2. Upgrader le plan Vercel (Pro = 60s timeout)
3. Splitter les requirements en plusieurs fichiers

### Table mal parsée

**Vérifier:**
- La table est valide dans Word
- Les cellules ne sont pas fusionnées
- Tester avec `"titleExtraction": {"type": "table"}`

---

## 📚 Documentation complète

Voir les fichiers dans `docs/`:
- `EXTRACT_DOCX_API.md` - Référence complète de l'API
- `EXTRACT_DOCX_EXAMPLES.md` - 7 exemples détaillés
- `EXTRACT_DOCX_DEPLOYMENT.md` - Guide de déploiement

---

## 🔄 Workflow complet

### 1. Développement local
```bash
npm run dev
# Tester sur http://localhost:3000
```

### 2. Intégration dans l'app
```typescript
// Dans vos composants
import { DocxExtractor } from "@/app/components/docx-extractor";

<DocxExtractor onExtract={handleExtract} />
```

### 3. Sauvegarder les requirements
```typescript
const { structured } = await response.json();
const requirements = structured.flatMap(s => s.requirements);

// Sauvegarder en Supabase
await supabase.from("requirements").insert(requirements);
```

### 4. Push et déploiement
```bash
git add .
git commit -m "feat: add DOCX extraction API"
git push origin main
# Vercel déploie automatiquement
```

---

## 📦 Dépendances ajoutées

```json
{
  "docx-parser": "^0.2.1"
}
```

Aucune autre dépendance nécessaire! (utilise les libs Next.js existantes)

---

## 💡 Prochaines étapes possibles

1. **Caching** - Cache les extractions pour éviter les re-uploads
2. **Webhooks** - Notifier un service quand l'extraction est faite
3. **Validation** - Valider les requirements extraits
4. **Templates** - Sauvegarder les configs de patterns
5. **Batch processing** - Traiter plusieurs fichiers

---

## 📞 Questions?

1. Vérifier la documentation dans `docs/`
2. Vérifier les logs: `vercel logs --prod`
3. Tester le regex: https://regex101.com/
4. Consulter les examples dans `EXTRACT_DOCX_EXAMPLES.md`

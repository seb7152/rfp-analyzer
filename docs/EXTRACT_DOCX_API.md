# API Extract DOCX

API pour extraire et analyser les requirements d'un fichier DOCX.

## Endpoint

```
POST /api/extract-docx
```

## Utilisation

### Exemple simple

```bash
curl -X POST http://localhost:3000/api/extract-docx \
  -F "file=@requirements.docx"
```

### Avec configuration de requirements

```bash
curl -X POST http://localhost:3000/api/extract-docx \
  -F "file=@requirements.docx" \
  -F "requirementConfig={\"capturePattern\":\"REQ-([0-9]+)\"}"
```

## Configuration des Requirements

### Structure

```typescript
interface RequirementConfig {
  capturePattern?: string; // Regex avec groupes de capture
  codeTemplate?: string; // Template pour générer le code
  captureGroupIndex?: number; // Index du groupe (défaut: 1)
  titleExtraction?: ExtractionConfig; // Extraction du titre
  contentExtraction?: ExtractionConfig; // Extraction du contenu
}

interface ExtractionConfig {
  type: "inline" | "table";
  pattern?: string; // Pour inline: regex pattern
  groupIndex?: number; // Pour inline: groupe de capture
  columnIndex?: number; // Pour table: index de colonne
}
```

### Exemples de configuration

#### 1. Cas simple - Juste capturer le code

```json
{
  "capturePattern": "Exigence\\s*n°\\s*([a-zA-Z0-9]+)"
}
```

#### 2. Avec transformation du code

```json
{
  "capturePattern": "Exigence\\s*n°\\s*([0-9]+)",
  "codeTemplate": "REQ-$1:padStart(2,0):toUpperCase()"
}
```

Transformations supportées:

- `padStart(length, fillString)` - Remplir au début (ex: "1" → "01")
- `toUpperCase()` - Convertir en majuscules
- `toLowerCase()` - Convertir en minuscules
- `replace(pattern, replacement)` - Remplacer avec regex

#### 3. Avec titre et contenu (inline)

```json
{
  "capturePattern": "Exigence\\s*n°\\s*([a-zA-Z0-9]+)",
  "codeTemplate": "REQ-$1:padStart(2,0)",
  "titleExtraction": {
    "type": "inline",
    "pattern": "Exigence\\s*n°\\s*[a-zA-Z0-9]+\\s*[-:]\\s*([^\\n:]+?)\\s*[-:]",
    "groupIndex": 1
  },
  "contentExtraction": {
    "type": "inline",
    "pattern": "Exigence\\s*n°\\s*[a-zA-Z0-9]+(?:\\s*[-:]\\s*[^\\n:]+?)?\\s*[-:]\\s*(.+?)$",
    "groupIndex": 1
  }
}
```

#### 4. Avec titre et contenu depuis les tables

```json
{
  "capturePattern": "REQ-([0-9]+)",
  "codeTemplate": "REQ-$1:padStart(2,0)",
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

## Réponse

```json
{
  "success": true,
  "structured": [
    {
      "level": 1,
      "title": "Introduction",
      "content": ["Texte du contenu"],
      "tables": [
        ["Colonne 1", "Colonne 2", "Colonne 3"],
        ["Ligne 1 Col 1", "Ligne 1 Col 2", "Ligne 1 Col 3"]
      ],
      "requirements": [
        {
          "code": "REQ-01",
          "originalCapture": "REQ-1",
          "title": "Titre du requirement",
          "content": "Contenu du requirement"
        }
      ]
    }
  ]
}
```

## Structure du document DOCX

L'API supporte:

- **Headings**: Détection automatique des niveaux (Heading 1-6, Title, etc.)
- **Paragraphs**: Texte normal
- **Tables**: Toutes les cellules sont extraites
- **Styles**: Tous les styles Word standard

## JavaScript/TypeScript Client

```typescript
async function extractDocx(file: File, config?: RequirementConfig) {
  const formData = new FormData();
  formData.append("file", file);

  if (config) {
    formData.append("requirementConfig", JSON.stringify(config));
  }

  const response = await fetch("/api/extract-docx", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}

// Utilisation
const file = document.querySelector("input[type=file]").files[0];
const result = await extractDocx(file, {
  capturePattern: "REQ-([0-9]+)",
  codeTemplate: "REQ-$1:padStart(2,0)",
});

console.log(result.structured);
```

## Erreurs possibles

- **400**: Fichier manquant, format invalide ou configuration JSON invalide
- **500**: Erreur lors du parsing du DOCX

## Performance

- Fichiers < 10 MB: < 1 seconde
- Fichiers < 50 MB: < 5 secondes
- Compatible avec Vercel (les timers sont limités selon le plan)

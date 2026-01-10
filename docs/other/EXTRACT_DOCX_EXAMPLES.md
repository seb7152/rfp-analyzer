# Exemples d'utilisation - API Extract DOCX

## 1. Extraction simple sans configuration

Extrait uniquement la structure (headings, paragraphes, tables).

**Request:**

```bash
curl -X POST http://localhost:3000/api/extract-docx \
  -F "file=@requirements.docx"
```

**Response:**

```json
{
  "success": true,
  "structured": [
    {
      "level": 0,
      "title": "Root",
      "content": [],
      "tables": [],
      "requirements": []
    },
    {
      "level": 1,
      "title": "Introduction",
      "content": ["Ceci est le contenu de l'introduction."],
      "tables": [],
      "requirements": []
    },
    {
      "level": 2,
      "title": "Sous-section",
      "content": ["Contenu avec REQ-001 mentionné."],
      "tables": [],
      "requirements": []
    }
  ]
}
```

---

## 2. Extraction avec pattern simple

Capture uniquement les codes REQ.

**Config:**

```json
{
  "capturePattern": "REQ-([0-9]+)"
}
```

**Document DOCX contient:**

```
REQ-001: Authentification utilisateur
REQ-002: Gestion des permissions
REQ-003: Audit logging
```

**Response:**

```json
{
  "success": true,
  "structured": [
    {
      "level": 1,
      "title": "Requirements",
      "content": [
        "REQ-001: Authentification utilisateur",
        "REQ-002: Gestion des permissions",
        "REQ-003: Audit logging"
      ],
      "tables": [],
      "requirements": [
        {
          "code": "REQ-001",
          "originalCapture": "REQ-001"
        },
        {
          "code": "REQ-002",
          "originalCapture": "REQ-002"
        },
        {
          "code": "REQ-003",
          "originalCapture": "REQ-003"
        }
      ]
    }
  ]
}
```

---

## 3. Extraction avec transformation de code

Reformate les codes avec padding.

**Config:**

```json
{
  "capturePattern": "Req\\s*([0-9]+)",
  "codeTemplate": "REQ-$1:padStart(3,0)"
}
```

**Document DOCX contient:**

```
Req 1: Feature A
Req 25: Feature B
Req 103: Feature C
```

**Response:**

```json
{
  "requirements": [
    {
      "code": "REQ-001",
      "originalCapture": "Req 1"
    },
    {
      "code": "REQ-025",
      "originalCapture": "Req 25"
    },
    {
      "code": "REQ-103",
      "originalCapture": "Req 103"
    }
  ]
}
```

---

## 4. Extraction avec titre et contenu (inline)

**Config:**

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
    "pattern": "REQ-[0-9]+(?:\\s*[-:]\\s*[^\\n:]+?)?\\s*[-:]\\s*(.+?)(?=REQ-|$)",
    "groupIndex": 1
  }
}
```

**Document DOCX contient:**

```
REQ-1 - Authentification : Le système doit supporter OAuth2 et SSO

REQ-2 - Logging : Tous les accès doivent être loggés avec timestamp et user ID
```

**Response:**

```json
{
  "requirements": [
    {
      "code": "REQ-01",
      "originalCapture": "REQ-1",
      "title": "Authentification",
      "content": "Le système doit supporter OAuth2 et SSO"
    },
    {
      "code": "REQ-02",
      "originalCapture": "REQ-2",
      "title": "Logging",
      "content": "Tous les accès doivent être loggés avec timestamp et user ID"
    }
  ]
}
```

---

## 5. Extraction depuis des tables

**Config:**

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

**Document DOCX contient une table:**

```
┌──────────┬─────────────────────┬──────────────────────────────────┐
│ Code     │ Catégorie           │ Description                      │
├──────────┼─────────────────────┼──────────────────────────────────┤
│ REQ-01   │ Authentification     │ Support OAuth2 et SSO            │
│ REQ-02   │ Logging             │ Tous les accès doivent être log  │
│ REQ-03   │ Performance         │ Temps de réponse < 200ms         │
└──────────┴─────────────────────┴──────────────────────────────────┘
```

**Response:**

```json
{
  "tables": [
    ["Code", "Catégorie", "Description"],
    ["REQ-01", "Authentification", "Support OAuth2 et SSO"],
    ["REQ-02", "Logging", "Tous les accès doivent être log"],
    ["REQ-03", "Performance", "Temps de réponse < 200ms"]
  ],
  "requirements": [
    {
      "code": "REQ-01",
      "originalCapture": "REQ-01",
      "title": "REQ-01",
      "content": "Support OAuth2 et SSO"
    },
    {
      "code": "REQ-02",
      "originalCapture": "REQ-02",
      "title": "REQ-02",
      "content": "Tous les accès doivent être log"
    },
    {
      "code": "REQ-03",
      "originalCapture": "REQ-03",
      "title": "REQ-03",
      "content": "Temps de réponse < 200ms"
    }
  ]
}
```

---

## 6. Transformations chaînées

Appliquer plusieurs transformations à la valeur capturée.

**Config:**

```json
{
  "capturePattern": "req\\s*([a-z]+)(\\d+)",
  "codeTemplate": "REQ-$2:padStart(3,0):toUpperCase()"
}
```

**Document DOCX contient:**

```
req alpha1: Feature A
req beta25: Feature B
req gamma3: Feature C
```

**Response:**

```json
{
  "requirements": [
    {
      "code": "REQ-001",
      "originalCapture": "req alpha1"
    },
    {
      "code": "REQ-025",
      "originalCapture": "req beta25"
    },
    {
      "code": "REQ-003",
      "originalCapture": "req gamma3"
    }
  ]
}
```

---

## 7. Intégration TypeScript/React

```typescript
import { DocxExtractor } from "@/app/components/docx-extractor";

export default function RequirementsPage() {
  const handleExtract = (sections: Section[]) => {
    // Traiter les sections extraites
    const allRequirements = sections.flatMap(s => s.requirements);
    console.log(`Extracted ${allRequirements.length} requirements`);

    // Sauvegarder en base de données
    saveRequirementsToDatabase(allRequirements);
  };

  return (
    <div>
      <h1>Import RFP Requirements</h1>
      <DocxExtractor onExtract={handleExtract} />
    </div>
  );
}
```

---

## Notes importantes

### Expressions régulières

- Les caractères spéciaux doivent être échappés: `\d`, `\s`, `\w`
- Les groupes de capture: `(...)`
- Les modificateurs: `g` (global), `i` (insensible à la casse)

### Transformations

Les transformations dans `codeTemplate` s'appliquent après `$1`:

```
codeTemplate: "REQ-$1:padStart(3,0):toUpperCase()"
               ^^^^^^
               Valeur capturée $1 + transformations
```

### Tables vs Inline

- **inline**: Extrait du texte du document (paragraphes)
- **table**: Extrait depuis une table spécifique (cellules)

### Déduplication

L'API déduplique automatiquement les requirements avec le même `code`.

### Performance

- Documents < 10 MB: très rapide
- Patterns complexes: vérifier avec des regex testers
- Limites Vercel: les fonctions serverless sont limitées en durée selon le plan

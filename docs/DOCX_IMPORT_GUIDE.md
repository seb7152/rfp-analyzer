# Guide d'Import DOCX

## Vue d'ensemble

La fonctionnalité d'import DOCX permet d'extraire automatiquement des exigences depuis des fichiers Word (.docx) et de les importer dans le système RFP Analyzer.

## Accès

Depuis la page **Summary** d'un RFP :

1. Cliquez sur le bouton **Importer**
2. Sélectionnez **Importer depuis DOCX**

## Processus d'Import

### Étape 0 : Configurations Sauvegardées (Optionnel)

Si vous avez déjà sauvegardé des configurations pour ce RFP :

- Une carte bleue s'affiche en haut avec vos configurations
- Sélectionnez une configuration dans la liste déroulante
- Les paramètres se chargent automatiquement
- La configuration marquée "Par défaut" se charge automatiquement à l'ouverture
- Vous pouvez supprimer une configuration avec l'icône poubelle

### Étape 1 : Configuration

Configurez les paramètres d'extraction pour les trois éléments principaux :

#### Configuration Code (Obligatoire)

- **Type d'extraction** : `inline` (paragraphe) ou `table` (tableau)
- **Pattern Regex** : Expression régulière pour identifier le code (ex: `(\d+)`)
- **Groupe de capture** : Numéro du groupe de capture (généralement `1`)
- **Index de colonne** : Pour type `table`, spécifie la colonne contenant le code
- **Template de code** : Format final du code avec transformations

**Exemple de template :**

```
REQ-$1:padStart(2,0)
```

Transforme `5` en `REQ-05`

**Transformations disponibles :**

- `padStart(length, char)` : Remplit à gauche
- `toUpperCase()` : Convertit en majuscules
- `toLowerCase()` : Convertit en minuscules
- `replace(pattern, replacement)` : Remplace du texte
- `removeSpaces()` : Supprime les espaces
- `trim()` : Supprime les espaces de début/fin

#### Configuration Titre (Optionnelle)

- **Type d'extraction** : `inline` ou `table`
- **Pattern Regex** : (Optionnel) Laissez vide pour récupérer toute la cellule
- **Groupe de capture** : Si pattern fourni
- **Index de colonne** : Pour type `table`

#### Configuration Contenu (Optionnelle)

- **Type d'extraction** : `inline` ou `table`
- **Pattern Regex** : (Optionnel) Laissez vide pour récupérer toute la cellule
- **Groupe de capture** : Si pattern fourni
- **Index de colonne** : Pour type `table`

### Étape 1.5 : Sauvegarder la Configuration (Optionnel)

Avant d'extraire, vous pouvez sauvegarder votre configuration :

1. Cliquez sur **Sauvegarder config** en bas à gauche
2. Entrez un nom descriptif (ex: "Import cahier des charges")
3. Cliquez sur **Sauvegarder**
4. La configuration est maintenant disponible pour les prochains imports

**Avantages :**

- Réutilisation rapide pour le même type de document
- Pas besoin de reconfigurer les regex à chaque fois
- La première configuration sauvegardée devient automatiquement la configuration par défaut

### Étape 2 : Extraction et Prévisualisation

Après avoir cliqué sur **Extraire**, le système :

1. Parse le fichier DOCX
2. Applique les configurations d'extraction
3. Affiche un tableau de prévisualisation avec :
   - **Code** : Code de l'exigence
   - **Titre** : Titre extrait (si configuré)
   - **Contenu** : Description/contenu (si configuré)
   - **Contextes** : Nombre de paragraphes de contexte associés

**Statistiques affichées :**

- Nombre total d'exigences extraites
- Nombre avec titre
- Nombre avec contenu
- Nombre avec contextes

**Édition :**

- Cliquez sur **Éditer** pour modifier n'importe quelle exigence
- Validez avec ✓ ou annulez avec ✕

### Étape 3 : Import en Base

Cliquez sur **Importer en base** pour :

1. Créer automatiquement une catégorie "DOCX Import" (si elle n'existe pas)
2. Importer toutes les exigences dans cette catégorie
3. Rafraîchir la page pour voir les résultats

## Structure des Données Extraites

Le système extrait :

- **Code** : Identifiant unique de l'exigence
- **Titre** : Description courte
- **Contenu** : Description détaillée
- **Contextes** : Paragraphes environnants pour le contexte

Les contextes sont ajoutés automatiquement à la description sous forme :

```
[Contenu]

Contexte:
[Paragraphe 1]
[Paragraphe 2]
...
```

## Exemples de Configuration

### Exemple 1 : Tableau avec codes numériques

**Document :**
| Code | Titre | Description |
|------|-------|-------------|
| 1 | Auth | User login |
| 2 | Data | Storage |

**Configuration :**

- Code: `type=table`, `pattern=(\d+)`, `columnIndex=0`, `template=REQ-$1:padStart(2,0)`
- Titre: `type=table`, `columnIndex=1`
- Contenu: `type=table`, `columnIndex=2`

**Résultat :**

- `REQ-01` avec titre "Auth" et contenu "User login"
- `REQ-02` avec titre "Data" et contenu "Storage"

### Exemple 2 : Codes inline dans paragraphes

**Document :**

```
REQ-001: L'utilisateur doit pouvoir se connecter
Le système doit authentifier via OAuth2...

REQ-002: Les données doivent être chiffrées
Le stockage utilise AES-256...
```

**Configuration :**

- Code: `type=inline`, `pattern=REQ-(\d+)`, `template=REQ-$1`
- Titre: `type=inline`, `pattern=REQ-\d+:\s*(.+)`, `groupIndex=1`
- Contenu: Pas configuré (les paragraphes suivants seront dans les contextes)

## TODO / Améliorations Futures

- [ ] Configuration des niveaux de titre à importer
- [ ] Gestion de la hiérarchie des catégories depuis la structure du document
- [ ] Import dans une catégorie existante (au lieu de "DOCX Import")
- [ ] Prévisualisation de la structure hiérarchique avant import
- [ ] Support de patterns plus complexes (multi-lignes, etc.)
- [ ] Export de configuration pour réutilisation

## Notes Techniques

### API Endpoint

`POST /api/rfps/[rfpId]/requirements/import-docx`

**Body :**

```json
{
  "requirements": [
    {
      "code": "REQ-01",
      "title": "Titre optionnel",
      "content": "Contenu optionnel",
      "contexts": ["Contexte 1", "Contexte 2"]
    }
  ]
}
```

### Extraction DOCX

`POST /api/extract-docx`

Utilise :

- `JSZip` pour décompresser le fichier DOCX
- `fast-xml-parser` pour parser le XML Word
- Conservation de l'ordre du document (paragraphes + tableaux)
- Extraction récursive du texte depuis les éléments XML

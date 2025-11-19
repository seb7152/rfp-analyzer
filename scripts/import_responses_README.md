# Script d'Importation des Réponses RFP

## Fichier Généré

**Chemin**: `/Users/seb7152/Documents/RFP analyzer/RFP-Analyer/scripts/import_responses.sql`

## Résumé de l'Import

### Données Importées

- **Total de réponses**: 126 (18 requirements × 7 suppliers)
- **Fichier source**: `imports/RFP_Rating_Grid_Extract.json`
- **Date de génération**: 2025-11-15

### Mapping des Suppliers (JSON → Base de données)

1. ACCENTURE → **Accenture** (18 réponses)
2. ATAWAY → **Attaway** (18 réponses)
3. CAPGEMINI → **Cap Gémini** (18 réponses)
4. ITC → **ITCI** (18 réponses) - _Notation textuelle_
5. LUCEM → **LUCEM** (18 réponses)
6. PREREQUIS → **Prérequis** (18 réponses)
7. TCS → **TCS** (18 réponses)

## Modifications Appliquées

### 1. Noms des Suppliers Corrigés

✅ Tous les noms de suppliers utilisent maintenant les vrais noms de la base de données

### 2. Status Mis à Jour

✅ Tous les `status` sont définis sur `'pass'` (126/126)

- Aucun status `'pending'`

### 3. Traitement Spécial pour ITCI

✅ ITCI utilise des notations textuelles (string) au lieu de numériques

- `score` = NULL
- `text_response` = contenu de la notation

### 4. Autres Suppliers

✅ Notations numériques standard (0.5 à 5.0)

- `score` = valeur numérique
- `text_response` = NULL
- `comments` = commentaires détaillés

## Structure du Script

### En-tête

```sql
DO $$
DECLARE
    v_rfp_id UUID := 'YOUR_RFP_ID_HERE'; -- À remplacer par l'UUID réel
    v_supplier_id UUID;
    v_requirement_id UUID;
    v_response_count INTEGER := 0;
    v_error_count INTEGER := 0;
```

### Fonctionnalités

1. **Vérification RFP**: S'assure que le RFP existe
2. **Recherche Supplier**: Trouve chaque supplier par nom
3. **Recherche Requirement**: Trouve chaque requirement par référence (R - 1, R - 2, etc.)
4. **Gestion d'Erreurs**: Bloc BEGIN...EXCEPTION pour chaque insertion
5. **Upsert**: ON CONFLICT pour mettre à jour si l'entrée existe déjà
6. **Rapport Final**: Affiche le nombre de réponses importées et d'erreurs

### Exemple d'Insertion (Accenture - Score numérique)

```sql
INSERT INTO responses (
    requirement_id,
    supplier_id,
    score,
    text_response,
    comments,
    status
) VALUES (
    v_requirement_id,
    v_supplier_id,
    5,                    -- Score numérique
    NULL,                 -- Pas de texte
    'Accenture explicitly confirms...',
    'pass'
)
```

### Exemple d'Insertion (ITCI - Notation textuelle)

```sql
INSERT INTO responses (
    requirement_id,
    supplier_id,
    score,
    text_response,
    comments,
    status
) VALUES (
    v_requirement_id,
    v_supplier_id,
    NULL,                 -- Pas de score numérique
    'Explicit scope coverage: ITC states...',  -- Notation en texte
    '',                   -- Commentaire vide
    'pass'
)
```

## Avant d'Exécuter

### 1. Remplacer l'UUID du RFP

Trouvez l'UUID de votre RFP dans la base de données et remplacez `YOUR_RFP_ID_HERE` à la ligne 9.

```sql
-- Ligne 9 du script
v_rfp_id UUID := 'YOUR_RFP_ID_HERE';  -- Remplacez par: '12345678-1234-1234-1234-123456789abc'
```

### 2. Vérifier les Suppliers

Assurez-vous que les 7 suppliers existent dans votre base pour ce RFP:

- Accenture
- Attaway
- Cap Gémini
- ITCI
- LUCEM
- Prérequis
- TCS

### 3. Vérifier les Requirements

Le script s'attend à trouver 18 requirements avec les références:

- R - 1, R - 2, R - 3, R - 4, R - 5, R - 6, R - 7, R - 8, R - 9
- R - 11, R - 12, R - 13, R - 14, R - 15, R - 16, R - 17, R - 21, R - 22

## Exécution

### Dans Supabase SQL Editor

1. Ouvrez le SQL Editor dans Supabase
2. Copiez tout le contenu de `import_responses.sql`
3. Remplacez `YOUR_RFP_ID_HERE` par votre UUID RFP réel
4. Cliquez sur "Run"

### Sortie Attendue

```
NOTICE: Starting import for RFP ID: <votre-uuid>
NOTICE: ================================================
NOTICE: Processing Accenture (ID: <supplier-uuid>)
NOTICE: Processing ITCI (ID: <supplier-uuid>)
...
NOTICE: ================================================
NOTICE: Import completed
NOTICE: Successfully imported: 126 responses
NOTICE: Errors encountered: 0
NOTICE: ================================================
```

## Gestion des Erreurs

### Si un Supplier n'existe pas

```
WARNING: Supplier "Nom Supplier" not found for this RFP - skipping
```

→ Les 18 réponses de ce supplier seront ignorées

### Si un Requirement n'existe pas

```
WARNING: Requirement "R - X" not found - skipping
```

→ Cette réponse sera ignorée, le compteur d'erreurs augmentera

### Si une insertion échoue

```
WARNING: Error inserting response for R - X: <message d'erreur>
```

→ L'erreur est loggée mais le script continue

## Vérification Post-Import

### Compter les réponses importées

```sql
SELECT COUNT(*) FROM responses
WHERE requirement_id IN (
    SELECT id FROM requirements WHERE rfp_id = 'YOUR_RFP_ID_HERE'
);
-- Attendu: 126
```

### Vérifier par supplier

```sql
SELECT s.name, COUNT(r.*) as response_count
FROM suppliers s
LEFT JOIN responses r ON r.supplier_id = s.id
WHERE s.rfp_id = 'YOUR_RFP_ID_HERE'
GROUP BY s.name
ORDER BY s.name;
-- Attendu: 18 réponses par supplier
```

### Vérifier les status

```sql
SELECT status, COUNT(*)
FROM responses
WHERE requirement_id IN (
    SELECT id FROM requirements WHERE rfp_id = 'YOUR_RFP_ID_HERE'
)
GROUP BY status;
-- Attendu: pass | 126
```

### Vérifier ITCI (notations textuelles)

```sql
SELECT COUNT(*)
FROM responses r
JOIN suppliers s ON r.supplier_id = s.id
WHERE s.name = 'ITCI'
  AND s.rfp_id = 'YOUR_RFP_ID_HERE'
  AND r.text_response IS NOT NULL
  AND r.score IS NULL;
-- Attendu: 18
```

## Notes Importantes

1. **Idempotent**: Le script peut être exécuté plusieurs fois grâce à `ON CONFLICT ... DO UPDATE`
2. **Transaction**: Tout le script s'exécute dans une seule transaction (DO $$)
3. **Échappement SQL**: Tous les apostrophes dans les textes sont doublés (`''`)
4. **Encodage**: Le fichier est en UTF-8 pour supporter les caractères accentués

## Fichiers Liés

- Source JSON: `imports/RFP_Rating_Grid_Extract.json`
- Script SQL: `scripts/import_responses.sql`
- Documentation: `scripts/import_responses_README.md`

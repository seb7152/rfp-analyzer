# Quick Check - Script d'Importation RFP

## ✅ Validations Effectuées

### 1. Nombre Total de Réponses

```bash
grep -c "INSERT INTO responses" scripts/import_responses.sql
```

**Résultat attendu**: 126

### 2. Suppliers Traités (ordre dans le script)

```bash
grep "^    -- .* (18 responses)" scripts/import_responses.sql
```

**Résultat attendu**:

```
    -- Accenture (18 responses)
    -- ITCI (18 responses)
    -- TCS (18 responses)
    -- Cap Gémini (18 responses)
    -- LUCEM (18 responses)
    -- Attaway (18 responses)
    -- Prérequis (18 responses)
```

### 3. Tous les Status = 'pass'

```bash
grep "'pass'" scripts/import_responses.sql | wc -l
```

**Résultat attendu**: 126

### 4. Aucun Status = 'pending'

```bash
grep "'pending'" scripts/import_responses.sql | wc -l
```

**Résultat attendu**: 0

### 5. Vérification ITCI (Notations Textuelles)

```bash
# Compter les lignes avec score NULL dans la section ITCI
sed -n '/-- ITCI/,/-- TCS/p' scripts/import_responses.sql | grep -c "    NULL,"
```

**Résultat attendu**: ~36 (score NULL + text_response NULL pour chaque ligne)

## 🔍 Exemples de Données

### Exemple 1: Accenture - Score Numérique 5

- **Requirement**: R - 1
- **Score**: 5
- **Text Response**: NULL
- **Status**: 'pass'

### Exemple 2: Accenture - Score Décimal 3.5

- **Requirement**: R - 2
- **Score**: 3.5
- **Text Response**: NULL
- **Status**: 'pass'

### Exemple 3: ITCI - Notation Textuelle

- **Requirement**: R - 1
- **Score**: NULL
- **Text Response**: 'Explicit scope coverage: ITC states...'
- **Status**: 'pass'

## 📝 Checklist Pré-Exécution

- [ ] Le fichier `scripts/import_responses.sql` existe (6320 lignes)
- [ ] La ligne 9 contient `v_rfp_id UUID := 'YOUR_RFP_ID_HERE';`
- [ ] Vous avez récupéré l'UUID de votre RFP depuis la base de données
- [ ] Vous avez vérifié que les 7 suppliers existent dans votre RFP
- [ ] Vous avez vérifié que les 18 requirements existent dans votre RFP

## 🎯 Commande de Remplacement UUID

Si votre RFP UUID est par exemple: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

```bash
# Créer une copie avec l'UUID remplacé
sed "s/YOUR_RFP_ID_HERE/a1b2c3d4-e5f6-7890-abcd-ef1234567890/g" \
    scripts/import_responses.sql > scripts/import_responses_ready.sql
```

Puis exécutez `import_responses_ready.sql` dans Supabase SQL Editor.

## 🔧 Requêtes de Vérification Post-Import

### Compter toutes les réponses

```sql
SELECT COUNT(*) as total_responses
FROM responses r
JOIN requirements req ON r.requirement_id = req.id
WHERE req.rfp_id = 'YOUR_RFP_ID_HERE';
-- Attendu: 126
```

### Compter par supplier

```sql
SELECT
    s.name,
    COUNT(r.id) as response_count,
    COUNT(CASE WHEN r.score IS NOT NULL THEN 1 END) as numeric_scores,
    COUNT(CASE WHEN r.text_response IS NOT NULL THEN 1 END) as text_scores
FROM suppliers s
LEFT JOIN responses r ON r.supplier_id = s.id
WHERE s.rfp_id = 'YOUR_RFP_ID_HERE'
GROUP BY s.name
ORDER BY s.name;
-- Attendu: 18 réponses par supplier
-- ITCI devrait avoir 0 numeric_scores et 18 text_scores
-- Autres devraient avoir 18 numeric_scores et 0 text_scores
```

### Vérifier les status

```sql
SELECT
    r.status,
    COUNT(*) as count
FROM responses r
JOIN requirements req ON r.requirement_id = req.id
WHERE req.rfp_id = 'YOUR_RFP_ID_HERE'
GROUP BY r.status;
-- Attendu: pass | 126
```

### Détail ITCI

```sql
SELECT
    req.reference,
    r.score,
    LENGTH(r.text_response) as text_length,
    r.status
FROM responses r
JOIN requirements req ON r.requirement_id = req.id
JOIN suppliers s ON r.supplier_id = s.id
WHERE s.name = 'ITCI'
  AND s.rfp_id = 'YOUR_RFP_ID_HERE'
ORDER BY req.reference;
-- Attendu: 18 lignes avec score NULL et text_length > 0
```

### Statistiques des scores (hors ITCI)

```sql
SELECT
    r.score,
    COUNT(*) as count
FROM responses r
JOIN suppliers s ON r.supplier_id = s.id
WHERE s.rfp_id = 'YOUR_RFP_ID_HERE'
  AND s.name != 'ITCI'
GROUP BY r.score
ORDER BY r.score;
-- Devrait montrer la distribution des scores de 0.5 à 5.0
```

## 🚨 En cas de problème

### Erreur: "Supplier not found"

➡️ Vérifiez que le nom du supplier existe exactement tel quel dans la table suppliers
➡️ Vérifiez que le rfp_id est correct

### Erreur: "Requirement not found"

➡️ Vérifiez que les références (R - 1, R - 2, etc.) existent dans la table requirements
➡️ Notez les espaces: "R - 1" pas "R-1"

### Moins de 126 réponses importées

➡️ Consultez les WARNINGS dans l'output SQL
➡️ Vérifiez le compteur v_error_count dans l'output final

### Doublons

➡️ Le script utilise ON CONFLICT DO UPDATE, donc les doublons sont mis à jour
➡️ Pas de problème si vous ré-exécutez le script

---

**Date de génération**: 2025-11-15
**Version**: 1.0
**Fichiers**: import_responses.sql (6320 lignes), import_responses_README.md

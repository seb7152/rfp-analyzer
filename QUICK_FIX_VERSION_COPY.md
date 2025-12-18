# Instructions pour corriger l'erreur de création de version

## 🚨 Problème identifié

Erreur : `Failed to copy responses` lors de la création d'une version avec copie de réponses.

## 🔍 Cause racine

**Politique RLS manquante** : La table `responses` n'a pas la politique `SELECT` nécessaire pour permettre la lecture des réponses depuis une version source.

## ✅ Solution immédiate (recommandée)

### 1. Appliquer la politique manquante via l'interface Supabase

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Exécutez cette requête :

```sql
-- Ajouter la politique SELECT manquante pour les réponses
CREATE POLICY "Evaluators can select responses"
  ON responses FOR SELECT
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );
```

5. Cliquez sur "Run"

### 2. Tester la correction

1. Allez dans l'application
2. Allez dans un RFP
3. Allez dans l'onglet "Versions"
4. Créez une nouvelle version
5. Cochez "Copier les réponses"
6. Sélectionnez une version source
7. Validez

## 📊 Logs de diagnostique

Après avoir appliqué la correction, les logs du navigateur devraient montrer :

```
🔄 Starting response copy process
   Source version ID: [UUID]
   Target version ID: [UUID]
   Found X source responses
   Preparing to insert X responses
✅ Successfully copied responses
```

Si vous voyez toujours une erreur, les logs indiqueront :

```
❌ Error fetching source responses: [détails de l'erreur RLS]
```

## 🎯 Résultat attendu

Après correction :

- ✅ Création de version avec copie fonctionnelle
- ✅ Workflow de versionnement complet opérationnel
- ✅ Audit trail correctement enregistré

## 📝 Notes techniques

- Le problème vient uniquement de la politique `SELECT` manquante
- Les autres politiques (`INSERT`, `UPDATE`, `DELETE`) existent déjà
- Une fois la politique ajoutée, aucune modification de code n'est nécessaire
- Les logs améliorés dans le code aideront au futur diagnostique

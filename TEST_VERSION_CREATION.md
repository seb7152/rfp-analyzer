# Test de création de version avec logs améliorés

## Instructions pour diagnostiquer

1. **Appliquer d'abord la politique manquante** :
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Allez dans "SQL Editor"
   - Exécutez :

   ```sql
   CREATE POLICY "Evaluators can select responses"
   ON responses FOR SELECT
   USING (
     rfp_id IN (
       SELECT rfp_id FROM rfp_user_assignments
       WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
     )
   );
   ```

2. **Tester ensuite la création de version** :
   - Allez dans l'onglet "Versions" d'un RFP
   - Créez une nouvelle version
   - Cochez "Copier les réponses"
   - Sélectionnez une version source
   - Validez

3. **Observer les logs** :
   - Ouvrez la console du navigateur (F12)
   - Regardez les logs détaillés qui commencent par :
     - `🔄 Starting response copy process`
     - `   Source version ID: xxx`
     - `   Target version ID: xxx`
     - `   Found X source responses`
     - `   Preparing to insert X responses`
     - `✅ Successfully copied responses` OU `❌ Error copying responses`

## Ce que les logs indiqueront

- **Si ça échoue à l'étape "Found X source responses"** : Problème de politique SELECT
- **Si ça échoue à l'étape "insert responses"** : Problème de politique INSERT ou autre erreur
- **Si tout fonctionne** : Le problème est résolu !

## Logs attendus en cas de succès

```
🔄 Starting response copy process
   Source version ID: 12345678-1234-5678-123456789012
   Target version ID: 87654321-4321-8765-432109876543210
   Found 15 source responses
   Preparing to insert 15 responses
✅ Successfully copied responses
```

## Logs attendus en cas d'échec (politique manquante)

```
🔄 Starting response copy process
   Source version ID: 12345678-1234-5678-123456789012
   Target version ID: 87654321-4321-8765-432109876543210
❌ Error fetching source responses: { "code": "PGRST116", "details": "...", "hint": "...", "message": "policy violation for SELECT" }
```

## Actions correctives

Si les logs montrent une erreur de politique, la solution est dans `BUGFIX_VERSION_COPY_RESPONSES.md`.

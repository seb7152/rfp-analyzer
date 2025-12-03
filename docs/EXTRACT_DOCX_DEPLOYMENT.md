# Déploiement sur Vercel

Guide pour déployer l'API Extract DOCX sur Vercel.

## Prérequis

- Compte Vercel configuré
- Repository GitHub connecté
- Variables d'environnement configurées (si nécessaire)

## Configuration Vercel

### 1. Variables d'environnement

L'API n'a pas de dépendances externes (Supabase, etc.), donc pas de variables requises.

Si vous ajoutez des intégrations plus tard:
```
# Dans Settings > Environment Variables
# Aucune pour le moment
```

### 2. Build settings

Vercel détecte automatiquement Next.js. Vérifiez:

```
Framework: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

## Déploiement

### Option 1: Automatic (recommandé)

```bash
# Juste push votre code
git push origin feature/evaluation-versioning

# Vercel déploie automatiquement à partir de GitHub
```

### Option 2: Manual deployment

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer depuis la racine du projet
vercel

# Pour production
vercel --prod
```

## Vérification

### 1. Tester l'endpoint

```bash
# Test simple
curl -X POST https://your-project.vercel.app/api/extract-docx \
  -F "file=@test-document.docx"

# Avec configuration
curl -X POST https://your-project.vercel.app/api/extract-docx \
  -F "file=@test-document.docx" \
  -F "requirementConfig={\"capturePattern\":\"REQ-([0-9]+)\"}"
```

### 2. Vérifier les logs

```bash
vercel logs --prod
```

## Considérations Vercel

### Limitations

- **Timeout**: 10-60 secondes selon le plan
  - Free: 10 secondes
  - Pro: 60 secondes
  - Enterprise: personnalisé

- **Taille de file**: max 4.5 MB pour Free/Pro
  - Solution: Demander des fichiers plus petits ou upgrader

### Optimisations

```typescript
// Pour les fichiers volumineux, ajouter un timeout config
export const config = {
  maxDuration: 60, // secondes (Pro plan)
};
```

### Memory

- Free/Pro: 1024 MB
- Généralement suffisant pour les DOCX

## Intégration avec l'app existante

### 1. Mise à jour des imports

```typescript
// Frontend - utiliser directement l'endpoint Vercel
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const response = await fetch(`${API_URL}/api/extract-docx`, {
  method: "POST",
  body: formData,
});
```

### 2. Variables d'environnement client

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000  # dev

# Production (Vercel)
# Laisser vide - sera la même origine
```

### 3. Sauvegarder les requirements

```typescript
// Après extraction
const { structured } = await response.json();
const requirements = structured.flatMap(s => s.requirements);

// Sauvegarder en Supabase
const { error } = await supabase
  .from("requirements")
  .insert(requirements.map(req => ({
    rfp_id: rfpId,
    code: req.code,
    title: req.title,
    content: req.content,
    original_capture: req.originalCapture,
  })));
```

## Monitoring

### 1. Erreurs

```bash
# Voir les dernières erreurs
vercel logs --prod --error

# Spécifique à extract-docx
vercel logs --prod 2>&1 | grep extract-docx
```

### 2. Performance

Vérifier dans Vercel Dashboard:
- Durations moyennes
- Cold starts
- Error rates

### 3. Usage

```bash
# Via CLI
vercel analytics --prod

# Ou dans le Dashboard > Analytics
```

## Troubleshooting

### API returns 405

```
Vérifier que la méthode POST est utilisée
Vérifier le Content-Type: multipart/form-data
```

### Timeout

```
Fichier > 10 MB?
- Réduire la taille du fichier
- Upgrader le plan Vercel
- Implémenter chunking (avancé)
```

### "Could not parse DOCX"

```
Vérifier:
- Format .docx valide (ZIP)
- Pas corrompu
- Créé avec un éditeur compatible (Word, Google Docs, LibreOffice)
```

### Erreur TypeScript en déploiement

```bash
# Vérifier localement
npm run type-check

# Le build de Vercel fail?
# Vérifier les logs: vercel logs --prod --error

# Forcer rebuild
vercel rebuild --prod
```

## Rollback

Si une version pose problème:

```bash
# Voir les déploiements récents
vercel list

# Redéployer une version antérieure
vercel promote <deployment-url> --prod

# Ou via Git
git revert <commit-hash>
git push origin main
# Vercel redéploie automatiquement
```

## Exemple de flux complet

1. **Développement local**
   ```bash
   npm run dev
   # Test sur http://localhost:3000/api/extract-docx
   ```

2. **Commit et push**
   ```bash
   git add .
   git commit -m "feat: add DOCX extraction API"
   git push origin feature/evaluation-versioning
   ```

3. **Review et merge**
   ```bash
   # Vercel préview URL pour tester
   # Merge à main
   ```

4. **Production**
   ```bash
   # Vercel déploie automatiquement
   # Accessible sur https://your-project.vercel.app/api/extract-docx
   ```

5. **Intégration frontend**
   ```typescript
   // Utiliser l'endpoint dans l'app
   const response = await fetch("/api/extract-docx", {
     method: "POST",
     body: formData,
   });
   ```

## Support

- Documentation Vercel: https://vercel.com/docs
- Next.js API Routes: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- Signaler des bugs: https://github.com/your-org/rfp-analyzer/issues

# Système d'Annotations PDF - Documentation complète

## 📋 Vue d'ensemble

Ce système permet d'annoter des documents PDF avec des surlignages, des signets et des notes, avec navigation bidirectionnelle entre les annotations et l'interface d'évaluation des réponses RFP.

## ✅ Implémentation réalisée

### 1. Schéma de base de données

**Fichier:** `supabase/migrations/020_create_pdf_annotations_system.sql`

Tables créées :
- `pdf_annotations` : Stocke les annotations (surlignages, signets, notes)
- `annotation_groups` : Groupes d'annotations liées
- `annotation_group_members` : Liaison annotations ↔ groupes
- `annotation_details` : Vue consolidée avec jointures

Fonctionnalités :
- ✅ Row Level Security (RLS) par organisation
- ✅ Soft delete (deleted_at)
- ✅ Recherche full-text sur le contenu
- ✅ Fonction helper `create_annotation_with_context`
- ✅ Index optimisés pour les performances

### 2. Composants React

#### Architecture des fichiers

```
components/pdf/
├── types/
│   ├── annotation.types.ts          # Types pour annotations
│   └── pdf.types.ts                  # Types pour PDF.js
├── utils/
│   ├── pdfWorker.ts                  # Configuration PDF.js worker
│   └── pdfCoordinates.ts             # Utilitaires de coordonnées
├── hooks/
│   ├── usePDFDocument.ts             # Chargement de documents
│   ├── useTextSelection.ts           # Sélection de texte
│   ├── usePDFAnnotations.ts          # CRUD annotations
│   └── usePDFNavigation.ts           # Navigation bidirectionnelle
├── annotations/
│   ├── AnnotationHighlight.tsx       # Composant de surlignage
│   ├── AnnotationList.tsx            # Liste d'annotations
│   └── AnnotationColorPicker.tsx     # Sélecteur de couleur
├── contexts/
│   └── PDFAnnotationContext.tsx      # Contexte de navigation
├── PDFPage.tsx                       # Rendu d'une page PDF
├── PDFToolbar.tsx                    # Barre d'outils
├── PDFTextLayer.tsx                  # Couche de texte sélectionnable
├── PDFAnnotationLayer.tsx            # Couche d'annotations
├── PDFAnnotationPanel.tsx            # Panel latéral d'annotations
├── PDFViewer.tsx                     # Viewer de base
└── PDFViewerWithAnnotations.tsx      # Viewer complet avec annotations
```

### 3. API Routes

**Fichiers créés :**

1. `app/api/documents/[documentId]/annotations/route.ts`
   - `GET` : Récupérer les annotations d'un document
   - `POST` : Créer une nouvelle annotation

2. `app/api/documents/[documentId]/annotations/[annotationId]/route.ts`
   - `PUT` : Mettre à jour une annotation
   - `DELETE` : Supprimer (soft delete) une annotation

Sécurité :
- ✅ Authentification Supabase
- ✅ Vérification des permissions par organisation
- ✅ RLS au niveau base de données

### 4. Fonctionnalités implémentées

#### Surlignage de texte
- ✅ Sélection de texte dans le PDF
- ✅ Conversion coordonnées écran → PDF
- ✅ Fusion de rectangles multi-lignes
- ✅ 8 couleurs disponibles
- ✅ Sauvegarde du texte surligné

#### Signets
- ✅ Placement de marqueurs par clic
- ✅ Navigation directe vers la position

#### Notes
- ✅ Ajout de commentaires aux annotations
- ✅ Édition inline avec popover

#### Navigation bidirectionnelle
- ✅ Clic sur annotation → Ouvre le PDF à la bonne page
- ✅ Contexte partagé via React Context
- ✅ Animation de highlight temporaire
- ✅ Scroll automatique vers l'annotation

#### Panel d'annotations
- ✅ Liste groupée par page
- ✅ Recherche full-text
- ✅ Filtres par type (surlignage, signet, note)
- ✅ Statistiques d'utilisation
- ✅ Panel pliable/dépliable

## 🚀 Utilisation

### 1. Appliquer la migration de base de données

```bash
# Appliquer la migration Supabase
cd supabase
npx supabase db push
```

### 2. Utiliser le composant PDFViewerWithAnnotations

```tsx
import { PDFViewerWithAnnotations } from '@/components/pdf/PDFViewerWithAnnotations';
import { PDFAnnotationProvider } from '@/components/pdf/contexts/PDFAnnotationContext';

export function MyComponent() {
  return (
    <PDFAnnotationProvider>
      <PDFViewerWithAnnotations
        url="https://example.com/document.pdf"
        documentId="doc-123"
        organizationId="org-456"
        requirementId="req-789"  // Optionnel
        initialPage={1}
        showAnnotationPanel={true}
        onPageChange={(page) => console.log('Page:', page)}
      />
    </PDFAnnotationProvider>
  );
}
```

### 3. Intégrer dans l'évaluation des réponses

Dans `ComparisonView.tsx` ou `SupplierResponseCard.tsx` :

```tsx
import { AnnotationList } from '@/components/pdf/annotations/AnnotationList';
import { usePDFAnnotations } from '@/components/pdf/hooks/usePDFAnnotations';

// Dans le composant
const { annotations } = usePDFAnnotations(currentDocumentId, organizationId);

// Dans le rendu
<div className="mt-4">
  <AnnotationList
    annotations={annotations}
    requirementId={currentRequirement.id}
    title="📎 Preuves documentaires"
    compact
  />
</div>
```

### 4. Navigation vers une annotation

```tsx
import { usePDFAnnotationNavigation } from '@/components/pdf/contexts/PDFAnnotationContext';

function MyAnnotationButton({ annotation }) {
  const { navigateToAnnotation } = usePDFAnnotationNavigation();

  return (
    <button
      onClick={() =>
        navigateToAnnotation({
          documentId: annotation.documentId,
          pageNumber: annotation.pageNumber,
          annotationId: annotation.id,
          highlight: true,  // Anime l'annotation
        })
      }
    >
      Voir dans le PDF
    </button>
  );
}
```

## 📝 Prochaines étapes

### Phase 1 : Migration et tests (1-2 jours)

- [ ] Appliquer la migration de base de données en production
- [ ] Tester le système sur différents types de PDFs
- [ ] Corriger les bugs éventuels de rendu
- [ ] Valider les performances sur gros PDFs (>50 pages)

### Phase 2 : Intégration dans l'application (2-3 jours)

- [ ] Remplacer `PDFViewerSheet` par `PDFViewerWithAnnotations`
- [ ] Intégrer `AnnotationList` dans `ComparisonView`
- [ ] Intégrer `AnnotationList` dans `SupplierResponseCard`
- [ ] Ajouter un bouton "Voir les preuves" dans les requirements
- [ ] Wrapper l'application avec `PDFAnnotationProvider`

### Phase 3 : Améliorations UX (2-3 jours)

- [ ] Ajouter des raccourcis clavier (H = highlight, B = bookmark)
- [ ] Implémenter le drag-and-drop pour ajuster les annotations
- [ ] Ajouter des tags personnalisés aux annotations
- [ ] Créer un système de templates de notes
- [ ] Ajouter un mode "Focus" pour masquer tout sauf les annotations

### Phase 4 : Fonctionnalités avancées (optionnel)

- [ ] Export des annotations en PDF annoté
- [ ] Export des annotations en rapport Word/Excel
- [ ] Partage d'annotations entre membres de l'organisation
- [ ] Notifications quand une annotation est ajoutée
- [ ] Historique des modifications d'annotations
- [ ] Annotations collaboratives en temps réel (Supabase Realtime)
- [ ] OCR pour extraire du texte des PDF scannés
- [ ] Annotations sur images/diagrammes (zones rectangulaires)

## 🛠️ Configuration technique

### Dépendances installées

```json
{
  "dependencies": {
    "pdfjs-dist": "^3.11.174",
    "react-pdf": "^7.7.0"
  },
  "devDependencies": {
    "@types/pdfjs-dist": "^2.10.378"
  }
}
```

### Variables d'environnement

Aucune variable supplémentaire nécessaire. Le système utilise :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configuration PDF.js Worker

Le worker est chargé depuis unpkg CDN :
```typescript
pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
```

Pour une version self-hosted en production :
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
```

## 🐛 Debugging et résolution de problèmes

### Le PDF ne se charge pas

1. Vérifier que l'URL est signée et valide
2. Vérifier les CORS si le PDF est sur un domaine externe
3. Vérifier les logs de la console pour les erreurs PDF.js

### Les annotations ne s'affichent pas

1. Vérifier que `documentId` et `organizationId` sont valides
2. Vérifier les RLS policies dans Supabase
3. Vérifier que la migration a été appliquée
4. Vérifier les permissions de l'utilisateur

### Performance lente sur gros PDFs

1. Implémenter le lazy-loading des pages (afficher uniquement la page visible)
2. Réduire le nombre d'annotations chargées simultanément
3. Utiliser la virtualisation pour la liste d'annotations
4. Optimiser les index de base de données

### La sélection de texte ne fonctionne pas

1. Vérifier que `PDFTextLayer` est bien rendu
2. Vérifier que le mode annotation est sur "highlight"
3. Vérifier les coordonnées de sélection dans la console
4. Essayer avec un autre PDF (certains PDFs ont du texte en image)

## 📊 Structure de données

### Format d'une annotation

```typescript
{
  id: "uuid",
  organization_id: "org-uuid",
  document_id: "doc-uuid",
  requirement_id: "req-uuid",  // Optionnel
  supplier_id: "sup-uuid",     // Auto-rempli
  annotation_type: "highlight", // ou "bookmark" ou "note"
  page_number: 5,
  position: {
    type: "highlight",
    pageHeight: 842,
    pageWidth: 595,
    rects: [
      { x: 100, y: 200, width: 400, height: 20 },
      { x: 100, y: 220, width: 300, height: 20 }
    ],
    textRange: {
      startOffset: 123,
      endOffset: 456
    }
  },
  highlighted_text: "Texte surligné",
  note_content: "Ma note personnelle",
  color: "#FFEB3B",
  tags: ["preuve", "important"],
  created_by: "user-uuid",
  created_at: "2025-11-20T10:00:00Z",
  updated_at: "2025-11-20T10:00:00Z",
  deleted_at: null
}
```

## 🎨 Personnalisation

### Changer les couleurs disponibles

Modifier `components/pdf/annotations/AnnotationColorPicker.tsx` :

```typescript
export const ANNOTATION_COLORS = [
  { name: 'Jaune', value: '#FFEB3B', bg: 'bg-yellow-300' },
  { name: 'Vert', value: '#4CAF50', bg: 'bg-green-500' },
  // Ajouter vos couleurs
];
```

### Personnaliser le style des annotations

Modifier `components/pdf/annotations/AnnotationHighlight.tsx` :

```tsx
<div
  style={{
    backgroundColor: annotation.color,
    opacity: 0.4,  // Changer l'opacité
    borderRadius: '2px',  // Changer la bordure
  }}
/>
```

### Ajouter de nouveaux types d'annotations

1. Ajouter le type dans `annotation.types.ts`
2. Créer un composant dédié (ex: `AnnotationArrow.tsx`)
3. L'ajouter dans le switch de `PDFAnnotationLayer.tsx`
4. Mettre à jour la migration SQL pour accepter le nouveau type

## 📚 Ressources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [React-PDF Documentation](https://github.com/wojtekmaj/react-pdf)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [W3C Web Annotations](https://www.w3.org/TR/annotation-model/)

## 🤝 Support

Pour toute question ou problème :
1. Consulter ce README
2. Vérifier les logs de la console navigateur
3. Vérifier les logs Supabase
4. Consulter le fichier `IMPLEMENTATION_PLAN_PDF_ANNOTATIONS.md` pour les détails techniques

---

**Version:** 1.0.0
**Date:** 2025-11-20
**Auteur:** Développement RFP Analyzer

# Plan d'Implémentation : Sélection de Texte avec Menu Contextuel pour Création de Signets

**Version:** 1.0
**Date:** 2025-11-22
**Estimation:** 6-8 heures
**Approche:** Option A - Intégration PDFTextLayer avec Bouton Flottant (+)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture cible](#architecture-cible)
3. [Prérequis et état actuel](#prérequis-et-état-actuel)
4. [Phase 1 : Intégration du PDFTextLayer](#phase-1--intégration-du-pdftextlayer)
5. [Phase 2 : Création du SelectionToolbar](#phase-2--création-du-selectiontoolbar)
6. [Phase 3 : Connexion avec le système d'annotations](#phase-3--connexion-avec-le-système-dannotations)
7. [Phase 4 : Tests et améliorations](#phase-4--tests-et-améliorations)
8. [Points d'attention critiques](#points-dattention-critiques)
9. [Checklist de validation](#checklist-de-validation)

---

## 🎯 Vue d'ensemble

### Objectif

Permettre aux utilisateurs de sélectionner du texte dans un PDF et de créer un signet avec le texte sélectionné automatiquement copié en commentaire via un bouton flottant (+).

### User Flow

```
1. User sélectionne du texte dans le PDF
   ↓
2. Un bouton flottant "+" apparaît près de la sélection
   ↓
3. User clique sur le bouton "+"
   ↓
4. Un dialog s'ouvre avec :
   - Le texte sélectionné (pré-rempli et read-only)
   - Un champ pour ajouter un commentaire
   - Une option pour lier à une exigence (requirement)
   ↓
5. User valide → Création d'un bookmark avec :
   - annotationType: "bookmark"
   - highlightedText: texte sélectionné
   - noteContent: commentaire de l'utilisateur
   - position: coordonnées calculées depuis la sélection
```

### UX de référence

- **Medium** : Bouton flottant pour formater/commenter
- **Notion** : Menu contextuel sur sélection
- **Google Docs** : Toolbar de suggestion

---

## 🏗️ Architecture cible

### Structure des composants

```
PDFViewerWithAnnotations
├─ PDFToolbar
├─ PDFPage
│  ├─ <canvas> (rendu PDF)
│  ├─ PDFTextLayer (z-index: 20) ← À INTÉGRER
│  └─ PDFAnnotationLayer (z-index: 10)
├─ SelectionToolbar (position: fixed) ← À CRÉER
└─ SelectionDialog ← À CRÉER
```

### Flux de données

```typescript
// 1. Sélection de texte
PDFTextLayer.onMouseUp
  → window.getSelection()
  → onTextSelected(text, rects)

// 2. Propagation au parent
PDFPage.onTextSelected
  → PDFViewerWithAnnotations.handleTextSelected
  → setState({ selection: { text, rects, pageNumber } })

// 3. Affichage du toolbar
SelectionToolbar
  → Rendered if selection !== null
  → Position calculée depuis rects

// 4. Création du bookmark
SelectionToolbar.onClick("+")
  → Open SelectionDialog
  → User fills noteContent
  → createAnnotation({
      annotationType: "bookmark",
      highlightedText: selection.text,
      noteContent: userInput,
      position: calculatePosition(rects, viewport)
    })
```

---

## 🔍 Prérequis et état actuel

### ✅ Ce qui existe déjà

1. **Fichier PDFTextLayer.tsx** (`components/pdf/PDFTextLayer.tsx`)
   - Logique de rendu du texte PDF
   - Callback `onTextSelected(text: string, rects: DOMRect[])`
   - Gestion de `window.getSelection()`

2. **Système d'annotations complet**
   - Hook `usePDFAnnotations` avec `createAnnotation`
   - API routes pour CRUD annotations
   - Types `CreateAnnotationDTO`, `PDFAnnotation`
   - Support de `highlightedText` et `noteContent`

3. **Composants UI**
   - Radix UI Popover, Dialog, Alert Dialog
   - Button, Textarea, Badge composants
   - Design system cohérent

### ❌ Ce qui manque

1. **PDFTextLayer n'est pas rendu**
   - Pas d'import dans `PDFPage.tsx`
   - Pas de props drilling pour `onTextSelected`

2. **Pas de gestion de l'état de sélection**
   - Aucun state dans `PDFViewerWithAnnotations`
   - Pas de lifecycle management (clear on scroll, page change)

3. **Pas de UI pour la sélection**
   - Pas de `SelectionToolbar`
   - Pas de `SelectionDialog`

---

## Phase 1 : Intégration du PDFTextLayer

**Durée estimée:** 1.5-2h

### 1.1 Modifier `components/pdf/PDFPage.tsx`

**Fichier:** `components/pdf/PDFPage.tsx`

#### Changements requis :

```typescript
// 1. Importer PDFTextLayer
import { PDFTextLayer } from "./PDFTextLayer";

// 2. Ajouter le prop onTextSelected
interface PDFPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onPageLoad?: (page: PDFPageProxy) => void;
  onTextSelected?: (text: string, rects: DOMRect[]) => void; // ← NOUVEAU
  className?: string;
  children?: React.ReactNode;
}

// 3. Destructurer le nouveau prop
export function PDFPage({
  document,
  pageNumber,
  scale,
  onPageLoad,
  onTextSelected, // ← NOUVEAU
  className,
  children,
}: PDFPageProps) {
  // ... existing code ...

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: viewport.width,
        height: viewport.height,
        position: "relative",
        backgroundColor: "white",
      }}
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* Indicateur de rendu */}
      {rendering && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Rendu en cours...
          </div>
        </div>
      )}

      {/* NOUVEAU : Couche de texte pour la sélection */}
      {page && onTextSelected && (
        <PDFTextLayer
          page={page}
          scale={scale}
          onTextSelected={onTextSelected}
        />
      )}

      {/* Couches supplémentaires (annotations) */}
      {children}
    </div>
  );
}
```

#### Points d'attention :

- ✅ Le `PDFTextLayer` doit être **après** le canvas mais **avant** `children` (annotations)
- ✅ Conditional rendering : uniquement si `onTextSelected` est fourni
- ✅ Z-index géré par `PDFTextLayer` (déjà à 20)

---

### 1.2 Modifier `components/pdf/PDFViewerWithAnnotations.tsx`

**Fichier:** `components/pdf/PDFViewerWithAnnotations.tsx`

#### Changements requis :

```typescript
// 1. Ajouter l'état de sélection
export function PDFViewerWithAnnotations({
  url,
  documentId,
  organizationId,
  initialPage = 1,
  requirementId,
  onPageChange,
  className = "",
  requirements = [],
}: PDFViewerWithAnnotationsProps) {
  // ... existing states ...

  // NOUVEAU : État pour la sélection de texte
  const [textSelection, setTextSelection] = useState<{
    text: string;
    rects: DOMRect[];
    pageNumber: number;
    viewport: { width: number; height: number };
  } | null>(null);

  // ... existing hooks ...

  // 2. NOUVEAU : Callback pour gérer la sélection de texte
  const handleTextSelected = useCallback(
    (text: string, rects: DOMRect[]) => {
      if (!loadedPage || text.length === 0) {
        setTextSelection(null);
        return;
      }

      const viewport = loadedPage.getViewport({ scale });

      setTextSelection({
        text,
        rects,
        pageNumber: currentPage,
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
      });
    },
    [loadedPage, scale, currentPage]
  );

  // 3. NOUVEAU : Effacer la sélection lors du changement de page
  useEffect(() => {
    setTextSelection(null);
  }, [currentPage]);

  // 4. NOUVEAU : Effacer la sélection lors du scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 5. NOUVEAU : Effacer la sélection lors du clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ne pas effacer si on clique sur le toolbar de sélection
      if (target.closest('.selection-toolbar')) return;

      // Ne pas effacer si on clique dans le PDF text layer
      if (target.closest('.pdf-text-layer')) return;

      setTextSelection(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ... existing handlers ...

  return (
    <div className={`flex h-full ${className}`}>
      <div className="flex-1 flex flex-col">
        <PDFToolbar
          // ... existing props ...
        />

        <div
          className="flex-1 overflow-auto bg-gray-100 p-4"
          ref={containerRef}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative"
              onClick={handleCanvasClick}
              style={{
                cursor: annotationMode === "bookmark" ? "crosshair" : "default",
              }}
            >
              <PDFPage
                document={document}
                pageNumber={currentPage}
                scale={scale}
                onPageLoad={handlePageLoad}
                onTextSelected={handleTextSelected} // ← NOUVEAU
                className="shadow-lg"
              >
                {/* Couche d'annotations */}
                {loadedPage && viewport && (
                  <PDFAnnotationLayer
                    annotations={annotations}
                    pageNumber={currentPage}
                    scale={scale}
                    pageWidth={viewport.width}
                    pageHeight={viewport.height}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    requirements={requirements}
                  />
                )}
              </PDFPage>
            </div>
          </div>
        </div>

        {/* NOUVEAU : Toolbar de sélection - À implémenter en Phase 2 */}
        {textSelection && (
          <SelectionToolbar
            selection={textSelection}
            onCreateBookmark={() => {/* TODO */}}
            onClear={() => setTextSelection(null)}
          />
        )}

        {/* Existing indicators */}
        {annotationMode === "bookmark" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
            📌 Mode signet - Cliquez pour ajouter
          </div>
        )}

        {isCreating && (
          <div className="absolute bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Création de l'annotation...
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Points d'attention :

- ✅ **Lifecycle management** : Effacer la sélection sur page change, scroll, clic extérieur
- ✅ **Viewport capture** : Stocker les dimensions pour calcul de position
- ✅ **Performance** : useCallback pour `handleTextSelected`

---

### 1.3 Vérifier le Z-Index dans `PDFTextLayer.tsx`

**Fichier:** `components/pdf/PDFTextLayer.tsx`

#### Vérification (normalement déjà correct) :

```typescript
// Ligne 97-109 : Vérifier que le z-index est correct
return (
  <div
    ref={textLayerRef}
    className="absolute inset-0 overflow-hidden select-text pdf-text-layer" // ← Ajouter classe pour sélecteur
    style={{
      width: viewport.width,
      height: viewport.height,
      lineHeight: 1,
      opacity: 0, // Transparent pour ne pas masquer le PDF
      zIndex: 20, // Au-dessus des annotations (z-index: 10)
    }}
  />
);
```

#### Points d'attention :

- ✅ Z-index: 20 > PDFAnnotationLayer (z-index: 10)
- ✅ `select-text` pour permettre la sélection
- ✅ `opacity: 0` pour transparence
- ⚠️ Ajouter classe `pdf-text-layer` pour le sélecteur CSS

---

### 1.4 Test de Phase 1

**Critères de validation :**

```typescript
// Test manuel :
// 1. Ouvrir un PDF dans l'application
// 2. Essayer de sélectionner du texte avec la souris
// 3. Vérifier dans la console :
console.log("Text selected:", textSelection);

// Devrait afficher :
// {
//   text: "Le texte sélectionné",
//   rects: [DOMRect, DOMRect, ...],
//   pageNumber: 1,
//   viewport: { width: 595, height: 842 }
// }

// 4. Changer de page → sélection devrait disparaître
// 5. Scroller → sélection devrait disparaître
// 6. Cliquer à l'extérieur → sélection devrait disparaître
```

**Log de debug à ajouter temporairement :**

```typescript
// Dans handleTextSelected
console.log("[PDFViewerWithAnnotations] Text selected:", {
  text: text.substring(0, 50) + "...",
  rectsCount: rects.length,
  pageNumber: currentPage,
});
```

---

## Phase 2 : Création du SelectionToolbar

**Durée estimée:** 2-3h

### 2.1 Créer le composant `SelectionToolbar`

**Nouveau fichier:** `components/pdf/SelectionToolbar.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionToolbarProps {
  selection: {
    text: string;
    rects: DOMRect[];
    pageNumber: number;
    viewport: { width: number; height: number };
  };
  onCreateBookmark: () => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selection,
  onCreateBookmark,
  onClear,
}: SelectionToolbarProps) {
  // Calculer la position du toolbar
  const position = useMemo(() => {
    const { rects } = selection;

    if (rects.length === 0) {
      return { top: 0, left: 0, display: 'none' };
    }

    // Utiliser le dernier rect pour positionner le toolbar
    const lastRect = rects[rects.length - 1];

    // Position : 8px sous la fin de la sélection, centré horizontalement
    return {
      top: lastRect.bottom + 8,
      left: lastRect.left + (lastRect.width / 2),
      display: 'flex',
    };
  }, [selection.rects]);

  return (
    <div
      className="selection-toolbar fixed z-50 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)', // Centrer horizontalement
        display: position.display,
      }}
    >
      <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5">
        {/* Bouton pour créer un bookmark */}
        <Button
          size="sm"
          onClick={onCreateBookmark}
          className="h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          title="Créer un signet avec cette sélection"
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Séparateur */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Bouton pour effacer la sélection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          title="Annuler"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Petite flèche pointant vers la sélection */}
      <div
        className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid white',
        }}
      />
    </div>
  );
}
```

#### Points d'attention :

- ✅ **Position fixed** : Reste visible lors du scroll
- ✅ **Transform translateX(-50%)** : Centré sur la sélection
- ✅ **Z-index: 50** : Au-dessus de tout
- ✅ **Animation** : fade-in + zoom-in pour UX fluide
- ✅ **Classe `selection-toolbar`** : Pour le sélecteur CSS (ne pas effacer au clic)

---

### 2.2 Créer le composant `SelectionDialog`

**Nouveau fichier:** `components/pdf/SelectionDialog.tsx`

```typescript
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Loader2 } from "lucide-react";
import type { RequirementInfo } from "./types/annotation.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  onConfirm: (noteContent: string, requirementId?: string) => void;
  isCreating?: boolean;
  requirements?: RequirementInfo[];
}

export function SelectionDialog({
  open,
  onOpenChange,
  selectedText,
  onConfirm,
  isCreating = false,
  requirements = [],
}: SelectionDialogProps) {
  const [noteContent, setNoteContent] = useState("");
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | undefined
  >(undefined);

  const handleConfirm = () => {
    onConfirm(noteContent, selectedRequirementId);
    // Reset state
    setNoteContent("");
    setSelectedRequirementId(undefined);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setNoteContent("");
      setSelectedRequirementId(undefined);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            Créer un signet
          </DialogTitle>
          <DialogDescription>
            Ajoutez un commentaire pour ce passage sélectionné. Vous pouvez
            également lier ce signet à une exigence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Texte sélectionné (lecture seule) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Texte sélectionné
            </Label>
            <div className="relative pl-3">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-blue-500" />
              <p className="text-sm text-gray-700 italic leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 max-h-32 overflow-y-auto">
                "{selectedText}"
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {selectedText.length} caractères
            </p>
          </div>

          {/* Commentaire (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="note-content" className="text-sm font-medium">
              Commentaire{" "}
              <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="note-content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Ajoutez vos notes ou réflexions sur ce passage..."
              rows={4}
              className="resize-none focus-visible:ring-blue-500"
            />
          </div>

          {/* Lier à une exigence (optionnel) */}
          {requirements.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="requirement" className="text-sm font-medium">
                Lier à une exigence{" "}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </Label>
              <Select
                value={selectedRequirementId}
                onValueChange={setSelectedRequirementId}
              >
                <SelectTrigger id="requirement">
                  <SelectValue placeholder="Sélectionner une exigence..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-gray-400">Aucune exigence</span>
                  </SelectItem>
                  {requirements.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {req.requirement_id_external}
                        </Badge>
                        <span className="text-sm truncate max-w-[300px]">
                          {req.title}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Créer le signet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Points d'attention :

- ✅ **Texte sélectionné read-only** : Affiché mais non modifiable
- ✅ **Commentaire optionnel** : L'utilisateur peut créer un signet sans note
- ✅ **Lien requirement optionnel** : Dropdown uniquement si requirements disponibles
- ✅ **État isCreating** : Disable buttons pendant la création
- ✅ **Reset state** : Nettoyer les champs après fermeture

---

### 2.3 Intégrer SelectionToolbar et SelectionDialog dans PDFViewerWithAnnotations

**Fichier:** `components/pdf/PDFViewerWithAnnotations.tsx`

```typescript
// 1. Importer les nouveaux composants
import { SelectionToolbar } from "./SelectionToolbar";
import { SelectionDialog } from "./SelectionDialog";

// 2. Ajouter un état pour le dialog
export function PDFViewerWithAnnotations({...}) {
  // ... existing states ...

  const [textSelection, setTextSelection] = useState<{...} | null>(null);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false); // ← NOUVEAU

  // ... existing code ...

  // 3. NOUVEAU : Handler pour ouvrir le dialog
  const handleCreateBookmarkClick = useCallback(() => {
    if (!textSelection) return;
    setShowSelectionDialog(true);
  }, [textSelection]);

  // 4. NOUVEAU : Handler pour confirmer la création
  const handleConfirmBookmark = useCallback(
    (noteContent: string, requirementId?: string) => {
      if (!textSelection || !documentId || !loadedPage) return;

      const viewport = loadedPage.getViewport({ scale });
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (!containerRect) return;

      // Calculer la position du bookmark
      // On utilise le premier rect de la sélection pour positionner le bookmark
      const firstRect = textSelection.rects[0];

      // Convertir les coordonnées viewport en coordonnées page
      const x = (firstRect.left - containerRect.left) / scale;
      const y = (firstRect.top - containerRect.top) / scale;

      const annotationDTO: CreateAnnotationDTO = {
        documentId,
        requirementId: requirementId === "none" ? undefined : requirementId,
        annotationType: "bookmark",
        pageNumber: textSelection.pageNumber,
        position: {
          type: "bookmark",
          pageHeight: viewport.height,
          pageWidth: viewport.width,
          rects: [{ x, y, width: 20, height: 20 }],
        },
        highlightedText: textSelection.text, // ← Le texte sélectionné
        noteContent: noteContent || undefined,
        color: "#2196F3",
      };

      createAnnotation(annotationDTO);

      // Fermer le dialog et effacer la sélection
      setShowSelectionDialog(false);
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [
      textSelection,
      documentId,
      loadedPage,
      scale,
      createAnnotation,
    ]
  );

  // ... existing code ...

  return (
    <div className={`flex h-full ${className}`}>
      <div className="flex-1 flex flex-col">
        {/* ... existing code ... */}

        {/* Toolbar de sélection */}
        {textSelection && (
          <SelectionToolbar
            selection={textSelection}
            onCreateBookmark={handleCreateBookmarkClick}
            onClear={() => {
              setTextSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
          />
        )}

        {/* Dialog de création de bookmark */}
        {textSelection && (
          <SelectionDialog
            open={showSelectionDialog}
            onOpenChange={setShowSelectionDialog}
            selectedText={textSelection.text}
            onConfirm={handleConfirmBookmark}
            isCreating={isCreating}
            requirements={requirements}
          />
        )}

        {/* ... existing indicators ... */}
      </div>
    </div>
  );
}
```

#### Points d'attention critiques :

- ⚠️ **Conversion de coordonnées** : Les `DOMRect` sont en coordonnées viewport, il faut les convertir en coordonnées page
- ⚠️ **Container bounds** : Utiliser `containerRef.current.getBoundingClientRect()` pour obtenir l'offset
- ✅ **Clear selection** : Appeler `window.getSelection()?.removeAllRanges()` après création
- ✅ **Requirement ID** : Gérer le cas "none" pour ne pas lier de requirement

---

### 2.4 Test de Phase 2

**Critères de validation :**

```typescript
// Test manuel :
// 1. Sélectionner du texte dans le PDF
// 2. Vérifier que le SelectionToolbar apparaît (bouton + bleu)
// 3. Cliquer sur le bouton "X" → toolbar devrait disparaître
// 4. Sélectionner à nouveau du texte
// 5. Cliquer sur le bouton "+" → dialog devrait s'ouvrir
// 6. Vérifier :
//    - Texte sélectionné affiché en read-only
//    - Champ commentaire vide
//    - Dropdown requirements (si disponibles)
// 7. Remplir le commentaire et cliquer "Créer le signet"
// 8. Vérifier qu'un bookmark apparaît sur le PDF
// 9. Cliquer sur le bookmark → popover devrait afficher :
//    - highlightedText: le texte sélectionné
//    - noteContent: le commentaire saisi
```

**Log de debug à ajouter :**

```typescript
// Dans handleConfirmBookmark
console.log("[PDFViewerWithAnnotations] Creating bookmark:", {
  selectedText: textSelection.text.substring(0, 50) + "...",
  noteContent,
  requirementId,
  position: { x, y },
  pageNumber: textSelection.pageNumber,
});
```

---

## Phase 3 : Connexion avec le système d'annotations

**Durée estimée:** 1-1.5h

### 3.1 Vérifier l'API d'annotations

**Fichier à vérifier:** `app/api/documents/[documentId]/annotations/route.ts`

#### S'assurer que l'API accepte `highlightedText` :

```typescript
// Ligne ~60-90 : Vérifier le POST handler
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } },
) {
  // ... existing code ...

  const {
    requirementId,
    annotationType,
    pageNumber,
    position,
    highlightedText, // ← Doit être accepté
    noteContent,
    color,
  } = await request.json();

  // ... existing validation ...

  const { data, error } = await supabase
    .from("pdf_annotations")
    .insert([
      {
        organization_id: organizationId,
        document_id: documentId,
        requirement_id: requirementId || null,
        annotation_type: annotationType,
        page_number: pageNumber,
        position: position,
        highlighted_text: highlightedText || null, // ← Doit être inséré
        note_content: noteContent || null,
        color: color || "#FFEB3B",
        created_by: userId,
      },
    ])
    .select()
    .single();

  // ... existing code ...
}
```

#### Points d'attention :

- ✅ Vérifier que `highlighted_text` est bien dans le schéma de base de données
- ✅ Si non, ajouter la migration nécessaire (voir Phase 3.2)

---

### 3.2 Migration de base de données (si nécessaire)

**Si la colonne `highlighted_text` n'existe pas déjà :**

```sql
-- Migration : add_highlighted_text_to_pdf_annotations.sql

ALTER TABLE pdf_annotations
ADD COLUMN IF NOT EXISTS highlighted_text TEXT;

COMMENT ON COLUMN pdf_annotations.highlighted_text IS
'Le texte sélectionné par l''utilisateur lors de la création de l''annotation';
```

**Vérification du schéma actuel :**

```sql
-- Requête pour vérifier si la colonne existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pdf_annotations'
AND column_name = 'highlighted_text';
```

#### Points d'attention :

- ✅ Vérifier dans Supabase Studio si la colonne existe
- ✅ Si elle existe déjà, passer cette étape
- ⚠️ Si elle n'existe pas, appliquer la migration via l'interface Supabase ou CLI

---

### 3.3 Mise à jour des types TypeScript

**Fichier:** `components/pdf/types/annotation.types.ts`

#### Vérifier que `highlightedText` est bien typé :

```typescript
// Ligne 23-39 : Vérifier l'interface PDFAnnotation
export interface PDFAnnotation {
  id: string;
  organizationId: string;
  documentId: string;
  requirementId?: string;
  supplierId?: string;
  annotationType: AnnotationType;
  pageNumber: number;
  position: AnnotationPosition;
  highlightedText?: string; // ← Doit être présent
  noteContent?: string;
  color: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Ligne 52-62 : Vérifier CreateAnnotationDTO
export interface CreateAnnotationDTO {
  documentId: string;
  requirementId?: string;
  annotationType: AnnotationType;
  pageNumber: number;
  position: AnnotationPosition;
  highlightedText?: string; // ← Doit être présent
  noteContent?: string;
  color?: string;
  tags?: string[];
}
```

#### Points d'attention :

- ✅ Ces types existent déjà (vérifiés dans l'analyse)
- ✅ Aucune modification requise normalement

---

### 3.4 Test de Phase 3

**Critères de validation :**

```typescript
// Test complet end-to-end :
// 1. Sélectionner du texte : "Lorem ipsum dolor sit amet"
// 2. Cliquer sur "+" → ouvrir dialog
// 3. Ajouter commentaire : "Important pour la section 2.1"
// 4. Lier à une exigence : "REQ-001"
// 5. Créer le bookmark
// 6. Vérifier dans la base de données :

// Requête SQL de vérification :
SELECT
  id,
  annotation_type,
  page_number,
  highlighted_text,
  note_content,
  requirement_id,
  created_at
FROM pdf_annotations
WHERE document_id = 'xxx'
ORDER BY created_at DESC
LIMIT 1;

// Résultat attendu :
// {
//   id: "uuid",
//   annotation_type: "bookmark",
//   page_number: 1,
//   highlighted_text: "Lorem ipsum dolor sit amet",
//   note_content: "Important pour la section 2.1",
//   requirement_id: "uuid-de-REQ-001",
//   created_at: "2025-11-22T..."
// }

// 7. Vérifier dans l'UI :
//    - Bookmark apparaît sur la page
//    - Cliquer sur le bookmark
//    - Popover affiche le texte sélectionné en italique
//    - Popover affiche le commentaire
//    - Badge de requirement visible
```

---

## Phase 4 : Tests et améliorations

**Durée estimée:** 1.5-2h

### 4.1 Tests de cas limites

#### Test 1 : Sélection multi-lignes

```typescript
// Sélectionner du texte sur plusieurs lignes
// Vérifier que :
// - Tous les rects sont capturés
// - Le toolbar se positionne correctement (dernière ligne)
// - Le texte complet est sauvegardé
```

#### Test 2 : Sélection très longue

```typescript
// Sélectionner plusieurs paragraphes (500+ caractères)
// Vérifier que :
// - Le texte est sauvegardé en entier
// - Le dialog affiche le texte avec scroll
// - La performance reste acceptable
```

#### Test 3 : Changement de page pendant la sélection

```typescript
// 1. Sélectionner du texte sur page 1
// 2. Changer pour page 2
// Vérifier que :
// - La sélection est effacée
// - Le toolbar disparaît
// - window.getSelection() est cleared
```

#### Test 4 : Zoom pendant la sélection

```typescript
// 1. Sélectionner du texte à zoom 100%
// 2. Zoomer à 150%
// Vérifier que :
// - La sélection reste visible
// - Le toolbar se repositionne correctement
// - Les coordonnées sont recalculées
```

#### Test 5 : Sélection dans différents scénarios

```typescript
// Scénarios :
// - Texte avec caractères spéciaux (é, à, ç, etc.)
// - Texte avec emojis
// - Texte en gras/italique
// - Texte dans des tableaux
// - Texte en colonne
```

---

### 4.2 Améliorations UX (optionnelles mais recommandées)

#### Amélioration 1 : Raccourci clavier

```typescript
// Dans PDFViewerWithAnnotations.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + B pour créer un bookmark depuis une sélection
    if ((e.ctrlKey || e.metaKey) && e.key === "b" && textSelection) {
      e.preventDefault();
      handleCreateBookmarkClick();
    }

    // Escape pour annuler la sélection
    if (e.key === "Escape" && textSelection) {
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [textSelection, handleCreateBookmarkClick]);
```

#### Amélioration 2 : Tooltip sur le bouton "+"

```typescript
// Dans SelectionToolbar.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Wrapper le bouton :
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button /* ... */>
        <Plus className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Créer un signet (Ctrl+B)</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Amélioration 3 : Animation du bookmark après création

```typescript
// Dans handleConfirmBookmark (PDFViewerWithAnnotations.tsx)
createAnnotation(annotationDTO);

// Ajouter un effet visuel temporaire
setShowSelectionDialog(false);
setTextSelection(null);

// Animation : flash du bookmark créé
setTimeout(() => {
  const createdBookmark = document.querySelector(
    `[data-annotation-id="${newAnnotationId}"]`,
  );
  createdBookmark?.classList.add("animate-pulse");
  setTimeout(() => {
    createdBookmark?.classList.remove("animate-pulse");
  }, 2000);
}, 500);
```

#### Amélioration 4 : Preview du texte sélectionné dans le toolbar

```typescript
// Dans SelectionToolbar.tsx
// Ajouter un preview du texte sélectionné (max 50 caractères)
<div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-3 py-1.5">
  {/* Preview du texte */}
  <span className="text-xs text-gray-600 max-w-[200px] truncate">
    "{selection.text.substring(0, 50)}{selection.text.length > 50 ? '...' : ''}"
  </span>

  <div className="w-px h-6 bg-gray-200" />

  {/* Bouton + */}
  <Button /* ... */ />

  {/* ... */}
</div>
```

#### Amélioration 5 : Afficher le nombre de caractères sélectionnés

```typescript
// Dans SelectionToolbar.tsx
<div className="text-xs text-gray-400 px-2">
  {selection.text.length} car.
</div>
```

---

### 4.3 Gestion des erreurs

#### Erreur 1 : Création échouée

```typescript
// Dans handleConfirmBookmark
try {
  await createAnnotation(annotationDTO);

  setShowSelectionDialog(false);
  setTextSelection(null);
  window.getSelection()?.removeAllRanges();

  // Success toast (optionnel)
  toast.success("Signet créé avec succès");
} catch (error) {
  console.error("[PDFViewerWithAnnotations] Failed to create bookmark:", error);

  // Error toast
  toast.error("Échec de la création du signet. Veuillez réessayer.");

  // Ne pas fermer le dialog pour permettre à l'utilisateur de réessayer
}
```

#### Erreur 2 : Sélection invalide

```typescript
// Dans handleTextSelected
const handleTextSelected = useCallback(
  (text: string, rects: DOMRect[]) => {
    // Validation
    if (!loadedPage) {
      console.warn("[PDFViewerWithAnnotations] No page loaded");
      return;
    }

    if (text.trim().length === 0) {
      console.warn("[PDFViewerWithAnnotations] Empty selection");
      setTextSelection(null);
      return;
    }

    if (rects.length === 0) {
      console.warn("[PDFViewerWithAnnotations] No rects for selection");
      setTextSelection(null);
      return;
    }

    // ... existing code ...
  },
  [loadedPage, scale, currentPage],
);
```

#### Erreur 3 : Position hors limites

```typescript
// Dans handleConfirmBookmark
// Vérifier que les coordonnées sont dans les limites de la page
const clampedX = Math.max(0, Math.min(x, viewport.width));
const clampedY = Math.max(0, Math.min(y, viewport.height));

const annotationDTO: CreateAnnotationDTO = {
  // ...
  position: {
    type: "bookmark",
    pageHeight: viewport.height,
    pageWidth: viewport.width,
    rects: [
      {
        x: clampedX,
        y: clampedY,
        width: 20,
        height: 20,
      },
    ],
  },
  // ...
};
```

---

### 4.4 Performance et optimisation

#### Optimisation 1 : Debounce de la sélection

```typescript
// Dans PDFTextLayer.tsx
import { useCallback, useRef } from "react";

// Debounce la sélection pour éviter trop d'appels
const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

const handleMouseUp = useCallback(() => {
  if (debounceTimeout.current) {
    clearTimeout(debounceTimeout.current);
  }

  debounceTimeout.current = setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());

    if (rects.length > 0 && onTextSelected) {
      onTextSelected(selectedText, rects as DOMRect[]);
    }
  }, 100); // 100ms debounce
}, [onTextSelected]);
```

#### Optimisation 2 : Memoization des positions

```typescript
// Dans SelectionToolbar.tsx
import { useMemo } from "react";

const position = useMemo(() => {
  // ... calcul de position ...
}, [selection.rects]);
```

#### Optimisation 3 : Lazy loading du dialog

```typescript
// Dans PDFViewerWithAnnotations.tsx
// Ne rendre le dialog que quand nécessaire
{textSelection && showSelectionDialog && (
  <SelectionDialog
    // ...
  />
)}
```

---

## 🚨 Points d'attention critiques et Analyse de Complexité

### 1. Conversion de coordonnées (CRITIQUE & COMPLEXE)

**Le défi :** `window.getSelection()` retourne des coordonnées relatives à la fenêtre du navigateur (viewport), alors que les annotations PDF doivent être positionnées relativement au canvas du PDF (page coordinates).

**La complexité :** Il faut appliquer une double transformation précise :

1.  **Offset Container** : Soustraire l'offset du conteneur PDF (`rect.left - containerRect.left`).
2.  **Scale Factor** : Diviser par le facteur de zoom (`scale`) pour que la position reste valide si l'utilisateur change le zoom plus tard.

**Risque :** Si c'est mal fait, les signets seront décalés ou "flotteront" au mauvais endroit lors du zoom ou du redimensionnement de la fenêtre.

**Formule de référence :**

```typescript
const pageX = (viewportRect.left - containerRect.left) / scale;
const pageY = (viewportRect.top - containerRect.top) / scale;
```

### 2. Gestion du Z-Index et des Couches (Layering)

**Le défi :** Gestion de l'empilement de 3 couches distinctes.
**La complexité :**

- **Couche 1 (Bas)** : Canvas (rendu visuel).
- **Couche 2 (Milieu)** : `PDFAnnotationLayer` (signets existants).
- **Couche 3 (Haut)** : `PDFTextLayer` (texte invisible).

**Contraintes strictes :**

- Le `PDFTextLayer` doit être **au-dessus** (`z-index: 20`) avec `pointer-events: auto` pour permettre la sélection.
- Il doit être **transparent** (`opacity: 0`).
- Il ne doit PAS bloquer les clics sur les signets existants (qui sont en `z-index: 10`). _Note: Cela peut nécessiter d'ajuster le pointer-events du text layer ou des annotations si des conflits surviennent._

### 3. Cycle de Vie de la Sélection (UX)

**Le défi :** L'expérience utilisateur doit être fluide et "propre".
**La complexité :** Gérer _quand_ faire disparaître la barre d'outils flottante pour éviter qu'elle ne devienne un artefact gênant.

- **Au scroll** : La barre doit disparaître ou suivre (choix: disparaître est plus simple et sûr).
- **Au changement de page** : Impératif de nettoyer l'état.
- **Au clic extérieur** : Doit fermer la toolbar.
- **Post-création** : Appel obligatoire à `window.getSelection()?.removeAllRanges()` pour retirer le surlignage bleu natif.

### 4. Base de Données & API

**État :** ✅ La colonne `highlighted_text` existe déjà dans la table `pdf_annotations`.
**Action :** Aucune migration requise. S'assurer simplement que le payload API inclut bien ce champ.

### 5. Performance

**Le défi :** La sélection de texte sur des PDF lourds peut déclencher des centaines d'événements.
**Stratégie :**

- Utiliser un `debounce` (ex: 100ms) sur l'événement de sélection.
- Limiter la taille du texte sélectionnable (ex: max 5000 caractères) pour éviter de surcharger le payload API.

---

## ✅ Checklist de validation

### Phase 1 : PDFTextLayer intégré

- [ ] `PDFTextLayer` importé dans `PDFPage.tsx`
- [ ] Prop `onTextSelected` ajouté à `PDFPageProps`
- [ ] `PDFTextLayer` rendu dans `PDFPage` avec z-index correct
- [ ] État `textSelection` créé dans `PDFViewerWithAnnotations`
- [ ] Callback `handleTextSelected` implémenté et connecté
- [ ] Lifecycle hooks pour effacer la sélection (page change, scroll, clic extérieur)
- [ ] Test : sélection de texte affiche les données dans la console
- [ ] Test : changement de page efface la sélection

### Phase 2 : UI de sélection

- [ ] Composant `SelectionToolbar` créé
- [ ] Calcul de position depuis `DOMRect` fonctionne
- [ ] Bouton "+" et "X" avec styles corrects
- [ ] Animation fade-in + zoom-in au mount
- [ ] Z-index 50 pour être au-dessus de tout
- [ ] Composant `SelectionDialog` créé
- [ ] Affichage du texte sélectionné en read-only
- [ ] Champ commentaire optionnel
- [ ] Dropdown requirements optionnel
- [ ] État `isCreating` pour disable les boutons
- [ ] Reset des champs après fermeture
- [ ] Test : clic sur "+" ouvre le dialog
- [ ] Test : clic sur "X" ferme le toolbar
- [ ] Test : validation crée le bookmark

### Phase 3 : Connexion backend

- [ ] API accepte `highlightedText` dans le POST body
- [ ] Colonne `highlighted_text` existe dans la base de données
- [ ] Migration appliquée si nécessaire
- [ ] Types TypeScript à jour (`PDFAnnotation`, `CreateAnnotationDTO`)
- [ ] Conversion de coordonnées viewport → page correcte
- [ ] Test : bookmark créé avec le bon `highlightedText`
- [ ] Test : bookmark positionné au bon endroit sur la page
- [ ] Test : popover affiche le texte sélectionné

### Phase 4 : Tests et polish

- [ ] Test : sélection multi-lignes
- [ ] Test : sélection très longue (500+ caractères)
- [ ] Test : changement de page pendant sélection
- [ ] Test : zoom pendant sélection
- [ ] Test : caractères spéciaux (é, à, emojis)
- [ ] Raccourci clavier Ctrl+B (optionnel)
- [ ] Tooltip sur le bouton "+" (optionnel)
- [ ] Preview du texte dans le toolbar (optionnel)
- [ ] Gestion d'erreur : création échouée
- [ ] Gestion d'erreur : sélection invalide
- [ ] Gestion d'erreur : position hors limites
- [ ] Performance : debounce de la sélection
- [ ] Performance : memoization des positions
- [ ] Documentation mise à jour

---

## 📝 Fichiers à créer/modifier

### Nouveaux fichiers (2)

1. `components/pdf/SelectionToolbar.tsx` (~80 lignes)
2. `components/pdf/SelectionDialog.tsx` (~150 lignes)

### Fichiers à modifier (3)

1. `components/pdf/PDFPage.tsx`
   - Ajouter import de `PDFTextLayer`
   - Ajouter prop `onTextSelected`
   - Rendre `PDFTextLayer` conditionnellement

2. `components/pdf/PDFViewerWithAnnotations.tsx`
   - Ajouter état `textSelection` et `showSelectionDialog`
   - Implémenter `handleTextSelected`, `handleCreateBookmarkClick`, `handleConfirmBookmark`
   - Ajouter lifecycle hooks (page change, scroll, clic extérieur)
   - Rendre `SelectionToolbar` et `SelectionDialog`

3. `components/pdf/PDFTextLayer.tsx`
   - Ajouter classe `pdf-text-layer` au container
   - (Optionnel) Ajouter debounce à `handleMouseUp`

### Fichiers à vérifier (2)

1. `app/api/documents/[documentId]/annotations/route.ts`
   - Vérifier que `highlighted_text` est accepté et inséré

2. `components/pdf/types/annotation.types.ts`
   - Vérifier que `highlightedText` est dans les types (déjà OK)

### Migration potentielle (si nécessaire)

1. `migrations/add_highlighted_text_to_pdf_annotations.sql`

---

## 🎯 Estimation finale

| Phase       | Tâches                      | Durée      | Difficulté            |
| ----------- | --------------------------- | ---------- | --------------------- |
| **Phase 1** | Intégrer PDFTextLayer       | 1.5-2h     | 🟡 Moyenne            |
| **Phase 2** | Créer UI (Toolbar + Dialog) | 2-3h       | 🟢 Faible             |
| **Phase 3** | Connexion backend           | 1-1.5h     | 🟢 Faible             |
| **Phase 4** | Tests et améliorations      | 1.5-2h     | 🟡 Moyenne            |
| **TOTAL**   |                             | **6-8.5h** | 🟡 **Faible-Moyenne** |

---

## 🚀 Ordre d'exécution recommandé

1. **Commencer par Phase 1.1-1.2** : Intégrer le PDFTextLayer et tester la sélection
2. **Puis Phase 2.1** : Créer le SelectionToolbar (sans dialog)
3. **Tester** : Vérifier que le toolbar apparaît bien
4. **Phase 2.2-2.3** : Ajouter le SelectionDialog
5. **Phase 3** : Connecter au backend
6. **Phase 4** : Tests et polish

**Bonne chance avec l'implémentation ! 🎉**

---

## 📚 Ressources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
- [Window.getSelection() MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection)
- [DOMRect MDN](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect)

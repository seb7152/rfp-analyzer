// Types pour la fonctionnalité de recherche dans les PDFs

export interface TextItem {
  text: string;
  pageNumber: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  pageIndex: number;
}

export interface SearchResult {
  id: string;
  text: string;
  pageNumber: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  context: string;
  pageIndex: number;
}

export interface UsePDFTextSearchProps {
  document: any; // PDFDocumentProxy - imported from pdf types
  scale: number;
  onPageChange?: (page: number) => void;
}

export interface UsePDFTextSearchReturn {
  searchQuery: string;
  searchResults: SearchResult[];
  currentResultIndex: number;
  isSearching: boolean;
  isExtracting: boolean;
  totalResults: number;
  search: (query: string) => void;
  navigateToResult: (index: number) => void;
  nextResult: () => void;
  previousResult: () => void;
  clearSearch: () => void;
  registerPageText: (pageNumber: number, items: TextItem[]) => void;
}

export interface PDFSearchLayerProps {
  searchResults: SearchResult[];
  currentResultIndex: number;
  scale: number;
  pageNumber: number;
}

export interface PDFTextLayerProps {
  page: any; // PDFPageProxy - imported from pdf types
  scale: number;
  onTextSelected?: (text: string, rects: DOMRect[]) => void;
  onTextExtracted?: (items: TextItem[]) => void;
}

// Cache LRU pour le texte extrait
export interface TextCache {
  get: (pageNumber: number) => TextItem[] | undefined;
  set: (pageNumber: number, items: TextItem[]) => void;
  clear: () => void;
  has: (pageNumber: number) => boolean;
}

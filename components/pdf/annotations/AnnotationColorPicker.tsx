import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

export const ANNOTATION_COLORS = [
  { name: 'Jaune', value: '#FFEB3B', bg: 'bg-yellow-300' },
  { name: 'Vert', value: '#4CAF50', bg: 'bg-green-500' },
  { name: 'Bleu', value: '#2196F3', bg: 'bg-blue-500' },
  { name: 'Orange', value: '#FF9800', bg: 'bg-orange-500' },
  { name: 'Rose', value: '#E91E63', bg: 'bg-pink-500' },
  { name: 'Violet', value: '#9C27B0', bg: 'bg-purple-600' },
  { name: 'Rouge', value: '#F44336', bg: 'bg-red-500' },
  { name: 'Cyan', value: '#00BCD4', bg: 'bg-cyan-500' },
];

interface AnnotationColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function AnnotationColorPicker({
  selectedColor,
  onColorChange,
  size = 'md',
}: AnnotationColorPickerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const gridSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`${sizeClasses[size]} p-0 relative`}
          title="Choisir une couleur"
        >
          <div
            className="absolute inset-1 rounded border-2 border-white"
            style={{ backgroundColor: selectedColor }}
          />
          <Palette className="w-0 h-0 opacity-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-52">
        <div className="space-y-2">
          <p className="text-sm font-medium">Couleur de surlignage</p>
          <div className="grid grid-cols-4 gap-2">
            {ANNOTATION_COLORS.map((color) => (
              <button
                key={color.value}
                className={`${gridSizeClasses[size]} rounded border-2 transition-all ${
                  selectedColor === color.value
                    ? 'border-blue-600 scale-110 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => onColorChange(color.value)}
                title={color.name}
              >
                {selectedColor === color.value && (
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white drop-shadow-md"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Aperçu */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 mb-1">Aperçu:</p>
            <div className="h-6 rounded" style={{ backgroundColor: selectedColor, opacity: 0.4 }}>
              <p className="text-xs px-2 py-1 text-gray-700">Texte surligné</p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

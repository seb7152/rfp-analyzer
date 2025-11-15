"use client";

import React from "react";
import { Star } from "lucide-react";

export interface StarRatingProps {
  /**
   * Score from 0-5 (or null for no score)
   */
  score: number | null;
  /**
   * Whether the rating is interactive (clickable)
   */
  interactive?: boolean;
  /**
   * Callback when a star is clicked (interactive mode only)
   */
  onScoreChange?: (score: number) => void;
  /**
   * Size of the stars
   */
  size?: "sm" | "md" | "lg";
  /**
   * Whether to show the score label (X/5)
   */
  showLabel?: boolean;
  /**
   * Whether this is a manual score (affects styling)
   */
  isManual?: boolean;
  /**
   * Custom CSS class
   */
  className?: string;
  /**
   * Whether to allow half-star ratings (0.5 increments)
   */
  allowHalfStars?: boolean;
}

export function StarRating({
  score = null,
  interactive = false,
  onScoreChange,
  size = "md",
  showLabel = true,
  isManual = false,
  className = "",
  allowHalfStars = false,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleStarClick = (starValue: number, isHalf = false) => {
    if (!interactive || !onScoreChange) return;

    const newValue = isHalf ? starValue - 0.5 : starValue;

    // Click again to reset
    if (score === newValue) {
      onScoreChange(0);
    } else {
      onScoreChange(newValue);
    }
  };

  const currentScore = score ?? 0;

  const renderStar = (starNumber: number) => {
    const currentScore = score ?? 0;
    let isFilled = false;
    let isHalfFilled = false;
    
    if (allowHalfStars) {
      // Logique pour les demi-étoiles
      if (currentScore >= starNumber) {
        isFilled = true;
      } else if (currentScore >= starNumber - 0.5) {
        isHalfFilled = true;
      }
    } else {
      // Logique actuelle
      isFilled = currentScore >= starNumber;
    }

    return (
      <div key={starNumber} className="relative">
        {/* Étoile de fond (toujours vide) */}
        <Star
          className={`${sizeClasses[size]} text-slate-300 dark:text-slate-600`}
        />
        
        {/* Étoile remplie (demi ou complète) */}
        {allowHalfStars ? (
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: isHalfFilled ? '50%' : isFilled ? '100%' : '0%' }}>
            <Star
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
            />
          </div>
        ) : (
          isFilled && (
            <Star
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 left-0`}
            />
          )
        )}
        
        {/* Zones cliquables pour les demi-étoiles */}
        {interactive && allowHalfStars && (
          <>
            <button
              className="absolute top-0 left-0 w-1/2 h-full cursor-pointer"
              onClick={() => handleStarClick(starNumber, true)}
              title={`Noter ${starNumber - 0.5}/5`}
            />
            <button
              className="absolute top-0 right-0 w-1/2 h-full cursor-pointer"
              onClick={() => handleStarClick(starNumber, false)}
              title={`Noter ${starNumber}/5`}
            />
          </>
        )}
        
        {/* Bouton normal pour le mode sans demi-étoiles */}
        {interactive && !allowHalfStars && (
          <button
            className="absolute top-0 left-0 w-full h-full cursor-pointer"
            onClick={() => handleStarClick(starNumber, false)}
            title={
              score === starNumber
                ? "Cliquez pour réinitialiser"
                : `Cliquer pour noter ${starNumber}/5`
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Stars */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(renderStar)}
      </div>

      {/* Score label with distinct styling for manual scores */}
      {showLabel && (
        <span
          className={`text-sm font-semibold ml-1 ${
            isManual && score !== null && score !== 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {allowHalfStars && score ? score.toFixed(1) : currentScore}/5
        </span>
      )}
    </div>
  );
}

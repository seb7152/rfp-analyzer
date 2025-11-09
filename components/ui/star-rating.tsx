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
}

export function StarRating({
  score = null,
  interactive = false,
  onScoreChange,
  size = "md",
  showLabel = true,
  isManual = false,
  className = "",
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleStarClick = (starValue: number) => {
    if (!interactive || !onScoreChange) return;

    // Click again to reset
    if (score === starValue) {
      onScoreChange(0);
    } else {
      onScoreChange(starValue);
    }
  };

  const currentScore = score ?? 0;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Stars */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const isFilled = score !== null && score !== 0 && i <= score;

          return (
            <button
              key={i}
              onClick={() => handleStarClick(i)}
              disabled={!interactive}
              className={`p-0.5 transition-opacity ${
                interactive
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              }`}
              title={
                interactive
                  ? score === i
                    ? "Cliquez pour réinitialiser"
                    : `Cliquer pour noter ${i}/5`
                  : `${score ?? "N/A"}/5`
              }
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              />
            </button>
          );
        })}
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
          {currentScore}/5
        </span>
      )}
    </div>
  );
}

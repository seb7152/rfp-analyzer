import React from "react";
import { cn } from "@/lib/utils";

export const Tree = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col", className)} {...props} />
));
Tree.displayName = "Tree";

export const TreeItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isExpanded?: boolean;
    isSelected?: boolean;
    level?: number;
  }
>(({ className, isExpanded, isSelected, level = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col",
      isSelected && "bg-slate-100 dark:bg-slate-800",
      className,
    )}
    {...props}
  />
));
TreeItem.displayName = "TreeItem";

export const TreeItemLabel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    level?: number;
    isExpanded?: boolean;
    hasChildren?: boolean;
  }
>(({ className, level = 0, isExpanded, hasChildren, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
      className,
    )}
    style={{ paddingLeft: `${level * 16 + 8}px` }}
    {...props}
  />
));
TreeItemLabel.displayName = "TreeItemLabel";

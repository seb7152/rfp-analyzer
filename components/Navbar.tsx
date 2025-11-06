"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface NavbarProps {
  activeTab: "config" | "comparison" | "responses";
  onTabChange: (tab: "config" | "comparison" | "responses") => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  rfpName?: string;
}

export function Navbar({
  activeTab,
  onTabChange,
  theme,
  onThemeChange,
  rfpName = "RFP - Infrastructure Cloud 2025",
}: NavbarProps) {
  const tabs = [
    { id: "config", label: "Configuration" },
    { id: "comparison", label: "Comparaison" },
    { id: "responses", label: "Réponses" },
  ] as const;

  return (
    <nav className="flex items-center justify-between h-12 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      {/* Left: Tabs */}
      <div className="flex items-center gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
              activeTab === tab.id
                ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Center: RFP Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <h1 className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {rfpName}
        </h1>
      </div>

      {/* Right: Theme toggle + Avatar */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
          className="w-8 h-8 rounded-md"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>

        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>US</AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
}

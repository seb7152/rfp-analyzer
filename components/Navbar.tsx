"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Always render navbar structure to avoid layout shift
  return (
    <nav className="sticky top-0 z-40 border-b bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Logo and Organization Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold">
            RFP Analyzer
          </Link>
          {isLoading || !user ? (
            <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <OrganizationSwitcher />
          )}
        </div>

        {/* Right: Theme Toggle and User Menu */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 p-0"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu */}
          {isLoading || !user ? (
            <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {user.full_name || user.email}
                </span>
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[200px] rounded-md border bg-white dark:bg-slate-900 shadow-md">
                  <div className="p-3 border-b">
                    <div className="text-sm font-semibold">
                      {user.full_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>

                  <div className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Déconnexion</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

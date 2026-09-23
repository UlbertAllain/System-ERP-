"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "nexty-erp-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";

    root.classList.toggle("dark", nextTheme === "dark");
    root.style.colorScheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="shrink-0"
      onClick={toggleTheme}
      aria-label="Ubah mode tampilan terang atau gelap"
      title="Ubah mode tampilan"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}

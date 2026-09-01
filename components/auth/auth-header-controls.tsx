"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/components/context/language-provider";

export function AuthHeaderControls() {
  const { LanguageSelector } = useTranslation();

  return (
    <div className="flex items-center gap-2 justify-center">
      <ThemeToggle />
      <LanguageSelector />
    </div>
  );
}

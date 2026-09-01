"use client";

import { LanguageContextType, TranslationKey } from "@/lib/aurora/types";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SelectField } from "../crud/form-fields";
import { enTranslations } from "@/lib/locale/en/common";
import { hiTranslations } from "@/lib/locale/hi/common";
import { viTranslations } from "@/lib/locale/vi/common";
import { chTranslations } from "@/lib/locale/ch/common";

const LanguageContext = createContext<LanguageContextType | null>(null);
const supportedLanguages = [
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
  { value: "ch", label: "Chinese" },
  { value: "hi", label: "Hindi" },
];
const selectedlanguage = "cv-language";
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("en");
  const translations = {
    en: enTranslations,
    hi: hiTranslations,
    vi: viTranslations,
    ch: chTranslations,
  };

  const t = (key: string) =>
    translations[language as keyof typeof translations]?.[
      key as TranslationKey
    ] ?? key;

  useEffect(() => {
    const localLanguage = localStorage.getItem(selectedlanguage);
    setLanguage(localLanguage ?? "en");
  }, []);
  
  const handleLanguage = (language: string) => {
    localStorage.setItem(selectedlanguage, language);
    setLanguage(language);
  };
  const LanguageSelector = ({ className }: { className?: string }) => (
    <div className={className ?? ""}>
      <SelectField
        label=""
        value={language}
        options={supportedLanguages}
        onChange={handleLanguage}
        placeholder={t("common.selectlanguage")}
      />
    </div>
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        loading: false,
        LanguageSelector,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useTranslation must be used inside LanguageProvider");
  }

  return context;
}

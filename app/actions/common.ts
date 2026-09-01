"use server";

import {
  clearSessionAndRedirectToLogin,
  refreshSession as refreshAuthSession,
} from "@/lib/api/http";
import * as languageApi from "@/lib/api/language";
import { Language, TranslationMap } from "@/lib/languages/types";

export async function fetchLanguages(): Promise<Language[]> {
  return languageApi.getSupportedLanguages();
}

export async function getLanguageTranslations(
  language: string,
): Promise<TranslationMap> {
  return languageApi.getLanguageTranslations(language);
}

export async function logout() {
  await clearSessionAndRedirectToLogin();
}

export async function refreshSession(): Promise<{ refreshed: boolean }> {
  const token = await refreshAuthSession();
  return { refreshed: token !== null };
}

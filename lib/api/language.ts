import { Language, TranslationMap } from "../languages/types";
import { apiGet, SERVICE_URLS } from "./http";

const baseUrl = () => `${SERVICE_URLS.language()}/api/v1`;

export async function getSupportedLanguages(): Promise<Language[]> {
  const res = await apiGet<{ data: Language[] }>(`${baseUrl()}/i18n/languages`);
  return res.data;
}

export async function getLanguageTranslations(
  language: string,
): Promise<TranslationMap> {
  const res = await apiGet<{ data: { translations: TranslationMap } }>(
    `${baseUrl()}/i18n/translations`,
    {
      "Accept-Language": language,
    },
  );
  return res.data.translations;
}

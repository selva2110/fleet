export interface Language {
  code: string;
  isDefault: boolean;
  name: string;
  nativeName: string;
}

export interface AllLanguagesResponse {
  success: boolean;
  data: Language[];
}

export type TranslationMap = Record<string, string>;

export type TranslationData = {
  locale: string;
  version: number;
  translations: TranslationMap;
};

export type TranslationResponse = {
  success: boolean;
  data: TranslationData;
};
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import countryCodes from "country-codes-list";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function firstLetterInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function uppperCaseInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function findById<T extends { id: string }>(
  items: T[],
  id: string | null | undefined,
): T | undefined {
  return id == null ? undefined : items.find((item) => item.id === id);
}

export function emptyResponse() {
  return {
    success: false,
    message: "No data available",
    data: [],
    metaData: {},
  };
}

export function emptyObjectResponse<T extends Object>(response: T) {
  return {
    success: false,
    message: "No data available",
    data: response,
  };
}

const ccodes = countryCodes.all();
const seenCallingCodes = new Set<string>();
export const COUNTRY_CODE_OPTIONS = ccodes
  .filter((item) => {
    if (seenCallingCodes.has(item.countryCallingCode)) return false;
    seenCallingCodes.add(item.countryCallingCode);
    return true;
  })
  .sort((a, b) => a.countryNameEn.localeCompare(b.countryNameEn))
  .map((item) => ({
    label: `${item.countryNameEn} (+${item.countryCallingCode})`,
    value: item.countryCallingCode,
  }));
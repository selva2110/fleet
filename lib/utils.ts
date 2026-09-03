import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

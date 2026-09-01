"use client";

import useSWR, { useSWRConfig } from "swr";
import { getCareItems, getCareItemTypes } from "@/app/actions/data";
import {
  saveCareItem as saveCareItemAction,
  deleteCareItem as deleteCareItemAction,
  saveCareItemType as saveCareItemTypeAction,
  deleteCareItemType as deleteCareItemTypeAction,
} from "@/app/actions/crud";
import { CareItem, CareItemForm, CareItemType, CareItemTypeForm } from "./types";

export const CARE_ITEMS_KEY = "careItems";
export const CARE_ITEM_TYPES_KEY = "careItemTypes";

const EMPTY_CARE_ITEMS: CareItem[] = [];
const EMPTY_CARE_ITEM_TYPES: CareItemType[] = [];

export function useCareItems() {
  const { data, isLoading, mutate } = useSWR<CareItem[]>(CARE_ITEMS_KEY, getCareItems);
  return { careItems: data ?? EMPTY_CARE_ITEMS, isLoading, mutate };
}

export function useCareItemTypes() {
  const { data, isLoading, mutate } = useSWR<CareItemType[]>(CARE_ITEM_TYPES_KEY, getCareItemTypes);
  return { careItemTypes: data ?? EMPTY_CARE_ITEM_TYPES, isLoading, mutate };
}

export function useCatalogMutations() {
  const { mutate } = useSWRConfig();

  async function createCareItem(input: CareItemForm, id?: string) {
    await saveCareItemAction(input, id);
    await mutate(CARE_ITEMS_KEY);
  }

  async function deleteCareItem(id: string) {
    await deleteCareItemAction(id);
    await mutate(CARE_ITEMS_KEY);
  }

  async function createCareItemType(input: CareItemTypeForm, id?: string) {
    await saveCareItemTypeAction(input, id);
    await mutate(CARE_ITEM_TYPES_KEY);
  }

  async function deleteCareItemType(id: string) {
    await deleteCareItemTypeAction(id);
    await mutate(CARE_ITEM_TYPES_KEY);
  }

  return { createCareItem, deleteCareItem, createCareItemType, deleteCareItemType };
}

"use client";

import useSWR, { useSWRConfig } from "swr";
import { GroupForm, GroupRecord } from "./groups";
import { getCatalogGroups, getParticipantsNotInList } from "@/app/actions/data";
import {
  deleteCatalogGroups,
  saveGroup as saveGroupAction,
} from "@/app/actions/crud";

export const PARTICIPANT_GROUPS_KEY = "participant-groups";
export const PARTICIPANTS_NOTINGROUPS = "participants-not-in-groups";
export const CATALOG_GROUPS = "catalog-groups";

const EMPTY_GROUPS: GroupForm[] = [];

// Single shared store: every consumer (Participants tab, New Meal Run
// dialog, ...) reads/writes this same SWR key, so group CRUD done in one
// place is immediately visible everywhere else.
export function useCatalogGroups(
  params: { typeId?: number; enabled?: boolean } = {},
) {
  const { enabled = true, ...queryParams } = params;
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? [CATALOG_GROUPS, queryParams] : null,
    ([, queryParams]) => getCatalogGroups(queryParams),
  );

  return {
    catalogGroups: data ?? EMPTY_GROUPS,
    error,
    isLoading,
    mutate,
  };
}

export function useParticipantsNotInGroups(
  params: { groupIds?: string[]; enabled?: boolean } = {},
) {
  const { enabled = true, ...queryParams } = params;
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? [PARTICIPANTS_NOTINGROUPS, queryParams] : null,
    ([, queryParams]) => getParticipantsNotInList(queryParams),
  );

  return {
    participants: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

const isCatalogGroupsKey = (key: unknown) =>
  Array.isArray(key) && key[0] === CATALOG_GROUPS;

export function useParticipantGroupMutations() {
  const { mutate } = useSWRConfig();

  function apply(updater: (groups: GroupRecord[]) => GroupRecord[]) {
    mutate<GroupRecord[]>(
      isCatalogGroupsKey,
      (current) => updater(current ?? []),
      { revalidate: false },
    );
  }

  async function saveGroups(input: GroupForm, editingGroupId?: string) {
    await saveGroupAction(
      editingGroupId ? { ...input, id: editingGroupId } : input,
      "ADMIN",
    );
    await mutate(isCatalogGroupsKey);
    await mutate(PARTICIPANTS_NOTINGROUPS);
  }

  async function deleteGroup(id: string) {
    await deleteCatalogGroups(Number(id), "ADMIN");
    apply((groups) => groups.filter((g) => g.id !== id));
    await mutate(PARTICIPANTS_NOTINGROUPS);
  }

  return { deleteGroup, saveGroups };
}

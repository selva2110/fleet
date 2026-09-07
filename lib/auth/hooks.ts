"use client";

import useSWR, { useSWRConfig } from "swr";
import { getRoles } from "@/app/actions/data";
import {
  createRole as createRoleAction,
  deleteRole as deleteRoleAction,
  updateRole as updateRoleAction,
} from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { Role } from "./types";

export const ROLES_KEY = "roles";

const EMPTY_ROLES: Role[] = [];

export function useRoles() {
  const { data, isLoading, mutate } = useSWR<Role[]>(ROLES_KEY, getRoles);
  return { roles: data ?? EMPTY_ROLES, isLoading, mutate };
}

export function useRoleMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function createRole(data: { name: string; description: string }) {
    const res = await createRoleAction(data, role);
    await mutate(ROLES_KEY);
    return res;
  }

  async function updateRole(
    id: number,
    data: { name: string; description: string; status: boolean },
  ) {
    const res = await updateRoleAction(id, data, role);
    await mutate(ROLES_KEY);
    return res;
  }

  async function deleteRole(id: number, name: string) {
    await deleteRoleAction(id, name, role);
    await mutate(ROLES_KEY);
  }

  return { createRole, updateRole, deleteRole };
}

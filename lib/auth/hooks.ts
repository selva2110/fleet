"use client";

import useSWR from "swr";
import { getRoles } from "@/app/actions/data";
import { Role } from "./types";

export const ROLES_KEY = "roles";

const EMPTY_ROLES: Role[] = [];

export function useRoles() {
  const { data, isLoading, mutate } = useSWR<Role[]>(ROLES_KEY, getRoles);
  return { roles: data ?? EMPTY_ROLES, isLoading, mutate };
}

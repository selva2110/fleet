"use server";

import { cookies } from "next/headers";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "@/lib/api/http";
import { LoginForm, LoginResponse, TokenCookies } from "../auth/types";
import { Role as RoleOptions } from "../auth/types";

function getAuthBaseUrl() {
  return `${SERVICE_URLS.auth()}/api/auth`;
}

function getAuthBase() {
  return `${SERVICE_URLS.auth()}/api/v1`;
}

export async function loginUser(data: LoginForm) {
  const { rememberMe, ...rest } = data;

  const response = await fetch(`${getAuthBaseUrl()}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rest),
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      success: false,
      error: "Invalid email or password",
    };
  }

  const result = (await response.json()) as LoginResponse;
  console.log("result",result)
  await setAuthCookies({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    role: result.roles?.[0],
    rememberToken: rememberMe,
    name: result.username,
    roleId:result.roleIds?.[0]
  });

  return {
    success: true,
  };
}

export async function registerAction(data: any) {
  try {
    const result = await apiPost<any>(`${getAuthBaseUrl()}/register`, data);
    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    console.error("Registration failed:", error);

    return {
      success: false,
      error: "Unable to create account",
    };
  }
}

export async function refreshAccessToken(
  token: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${getAuthBaseUrl()}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      accessToken?: string;
    };
    if (!data.accessToken) return null;
    await setAuthCookies({
      accessToken: data.accessToken,
      rememberToken: true
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function setAuthCookies({
  accessToken,
  refreshToken,
  role,
  rememberToken,
  name,
  roleId
}: TokenCookies) {
  const cookieStore = await cookies();

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: rememberToken ? 60 * 60 * 24 * 30 : undefined,
  };

  cookieStore.set("access_token", accessToken, options);
  refreshToken && cookieStore.set("refresh_token", refreshToken, options);
  role && cookieStore.set("role_access", role, options);
  name && cookieStore.set("user_name", name, options);
  roleId && cookieStore.set("roleId", String(roleId), options);
}

export async function listRoles(): Promise<RoleOptions[]> {
  // Rarely changes and is identical for every caller, so it's safe to
  // let the Next Data Cache absorb repeat requests for a short window.
  const res = await apiGet<RoleOptions[]>(`${getAuthBase()}/roles`, undefined, 60);
  return res;
}

export async function postUserRole(data:{name:string, description:string}): Promise<RoleOptions[]> {
  const res = await apiPost<RoleOptions[]>(`${getAuthBase()}/roles`, data);
  return res;
} 
export async function deleteRole(id: number): Promise<void> {
  await apiDelete(`${getAuthBase()}/roles/${id}`);
}

export async function getRoleById(id: number): Promise<RoleOptions[]> {
  const res = await apiGet<RoleOptions[]>(`${getAuthBase()}/roles/${id}`);
  return res;
}
export async function editRoleById(id: number, data: {name:string, description:string}): Promise<RoleOptions[]> {
  const res = await apiPut<RoleOptions[]>(`${getAuthBase()}/roles/${id}`, data);
  return res;
}
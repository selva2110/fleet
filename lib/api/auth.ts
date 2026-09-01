"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost, SERVICE_URLS } from "@/lib/api/http";
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
  await setAuthCookies({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    role: result.roles?.[0],
    rememberToken: rememberMe,
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
      rememberToken: true,
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
}

export async function listRoles(): Promise<RoleOptions[]> {
  const res = await apiGet<RoleOptions[]>(`${getAuthBase()}/roles`);
  return res;
}

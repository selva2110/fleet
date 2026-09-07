
export const MICROSOFT_LOGIN_CALLBACK_PATH = "/auth/callback";


const POST_LOGIN_REDIRECT_KEY = "cv.sso.postLoginRedirect";

export function rememberPostLoginRedirect(callbackUrl: string) {
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, callbackUrl);
  } catch {
    // sessionStorage unavailable (private browsing, disabled storage) — the
    // callback page will just fall back to the default destination.
  }
}

export function consumePostLoginRedirect(fallback = "/dashboard"): string {
  try {
    const stored = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return stored || fallback;
  } catch {
    return fallback;
  }
}

export interface MicrosoftCallbackFragment {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  error?: string;
}

/** Parses the `#access_token=...&refresh_token=...` (success) or
 * `#error=...` (failure) fragment the auth service redirects back with. */
export function parseMicrosoftCallbackFragment(
  hash: string,
): MicrosoftCallbackFragment {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleaned);
  return {
    accessToken: params.get("access_token") ?? undefined,
    refreshToken: params.get("refresh_token") ?? undefined,
    tokenType: params.get("token_type") ?? undefined,
    error: params.get("error") ?? undefined,
  };
}


export function microsoftSsoErrorMessageKey(code: string | null | undefined) {
  if (!code) return "auth.ssoErrorGeneric";
  const normalized = code.toLowerCase();

  switch (normalized) {
    case "no_email_claim":
      return "auth.ssoErrorNoEmail";
    case "no_account":
      return "auth.ssoErrorNoAccount";
    case "account_disabled":
      return "auth.ssoErrorAccountDisabled";
    case "account_uses_password_login":
      return "auth.ssoErrorWrongMethod";
  }

  if (/^account_uses_.+_login$/.test(normalized)) {
    return "auth.ssoErrorWrongMethod";
  }
  if (normalized.includes("access_denied") || normalized.includes("cancel")) {
    return "auth.ssoErrorCancelled";
  }
  return "auth.ssoErrorGeneric";
}

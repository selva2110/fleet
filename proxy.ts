import { NextRequest, NextResponse } from "next/server";
import { MICROSOFT_LOGIN_CALLBACK_PATH } from "@/lib/auth/microsoft-sso";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  MICROSOFT_LOGIN_CALLBACK_PATH,
];
const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!accessToken && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)$).*)",
  ],
};

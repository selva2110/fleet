import * as React from "react";
import { cookies } from "next/headers";
import { SessionProviderClient } from "@/components/context/session-provider-client";
import { TokenRefreshManager } from "@/components/context/token-refresh-provider";

export async function SessionManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const roleAccess = cookieStore.get("role_access")?.value;
  const isAdmin = roleAccess === "ADMIN";
  const isDispatcher = roleAccess === "DISPATCHER";

  return (
    <SessionProviderClient isAdmin={isAdmin} isDispatcher={isDispatcher} userRole={roleAccess ?? 'No Assigned Role'}>
      <TokenRefreshManager />
      {children}
    </SessionProviderClient>
  );
}

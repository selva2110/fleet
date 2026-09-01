"use client";

import * as React from "react";

type SessionContextValue = {
  isAdmin: boolean;
  isDispatcher: boolean;
  userRole: string;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProviderClient({
  isAdmin,
  isDispatcher,
  userRole,
  children,
}: {
  isAdmin: boolean;
  isDispatcher: boolean;
  children: React.ReactNode;
  userRole: string;
}) {
  return (
    <SessionContext.Provider value={{ isAdmin, isDispatcher, userRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionManager");
  }

  return context;
}

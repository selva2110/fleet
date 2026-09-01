"use client";

import * as React from "react";
import { refreshSession } from "@/app/actions/common";

const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function TokenRefreshManager() {
  React.useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        await refreshSession();
      } catch {
      } finally {
        inFlight = false;
      }
    };
    const intervalId = setInterval(tick, TOKEN_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return null;
}

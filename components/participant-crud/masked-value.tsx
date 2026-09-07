"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { maskSSN } from "@/lib/participant-crud/config";

/**
 * Displays a sensitive value (e.g. SSN) masked by default with a reveal toggle.
 * The raw value stays client-side only; nothing is logged.
 */
export function MaskedValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const has = Boolean(value.trim());

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="font-medium tabular-nums text-foreground">
        {has ? (revealed ? value : maskSSN(value)) : "—"}
      </span>
      {has ? (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={revealed ? "Hide value" : "Reveal value"}
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      ) : null}
    </span>
  );
}

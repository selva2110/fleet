// -----------------------------------------------------------------------------
// Driver Shifts — match score badge
//
// Renders a 0..100 participant/driver match score with a tone that reflects
// eligibility and score band. Shared by the shift details candidate list and
// the unassigned-participants recommendations.
// -----------------------------------------------------------------------------

import { cn } from "@/lib/utils";

/** Tone band for a 0..100 score, gated by eligibility. */
export function scoreToneClass(score: number, eligible: boolean): string {
  if (!eligible) return "bg-destructive/15 text-destructive";
  if (score >= 80) return "bg-success/15 text-success";
  if (score >= 55) return "bg-warning/20 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function MatchScoreBadge({
  score,
  eligible,
  className,
}: {
  score: number;
  eligible: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        scoreToneClass(score, eligible),
        className,
      )}
      title={eligible ? `Match score ${score}/100` : "Not eligible"}
    >
      {eligible ? `${score}` : "—"}
    </span>
  );
}

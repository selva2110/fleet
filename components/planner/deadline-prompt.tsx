"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/lib/events/hooks";
import { useTrips } from "@/lib/trips/hooks";
import { TripsUtils } from "@/lib/trips/utils";
import { useTranslation } from "@/components/context/language-provider";

export function DeadlinePrompt() {
  const { events } = useEvents();
  const { trips } = useTrips();
  const router = useRouter();
  const {t} = useTranslation();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const dueEvents = useMemo(() => {
    return events
      .map((e) => ({
        event: e,
        status: TripsUtils.getPlanStatus(e, trips),
      }))
      .filter(
        ({ status }) =>
          status.notificationsEnabled &&
          status.deadlinePassed &&
          !status.hasPlan &&
          status.canGenerate,
      )
      .map(({ event }) => event);
  }, [events, trips]);

  const pending = dueEvents.filter((e) => !dismissed[e.id]);
  if (pending.length === 0) return null;

  const first = pending[0];

  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <CalendarClock className="size-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-warning-foreground">
            {t('planner.deadlinereached').replace('{{name}}', first.name)}
          </p>
          <p className="text-xs text-warning-foreground/80">
            {t('planner.deadlinebody')}
            {pending.length > 1
              ? t('planner.moreevents')
                  .replace('{{count}}', String(pending.length - 1))
                  .replace('{{suffix}}', pending.length > 2 ? "s" : "")
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push(`/planner?id=${first.id}&autoplan=1`)}
          >
            {t('planner.openrouteplanner')}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t('common.dismiss')}
            onClick={() => setDismissed((d) => ({ ...d, [first.id]: true }))}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

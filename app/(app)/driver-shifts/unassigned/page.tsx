"use client";

// -----------------------------------------------------------------------------
// Driver Shifts — Unassigned participants
//
// Lists participants who are not on any active shift and, for each, ranks the
// available drivers with match scores so the dispatcher can assign in one step.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Users, Star, AlertTriangle, Check } from "lucide-react";

import { PageHeader, StatCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useDriverShifts } from "@/lib/driver-shifts/store";
import { SHIFT_PARTICIPANTS } from "@/lib/driver-shifts/mock-data";
import {
  recommendDrivers,
  to12h,
  assignmentConflict,
} from "@/lib/driver-shifts/logic";
import { MatchScoreBadge } from "@/components/driver-shifts/match-score";
import type { ShiftParticipant, DriverRecommendation, DriverShift } from "@/lib/driver-shifts/types";

export default function UnassignedParticipantsPage() {
  const { shifts, unassignedParticipantIds, assignParticipant } = useDriverShifts();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ShiftParticipant | null>(null);

  const unassigned = useMemo(() => {
    const set = new Set(unassignedParticipantIds);
    return SHIFT_PARTICIPANTS.filter((p) => set.has(p.id)).filter((p) =>
      query.trim()
        ? `${p.name} ${p.destination} ${p.pickupAddress}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        : true,
    );
  }, [unassignedParticipantIds, query]);

  const withNeeds = unassigned.filter((p) => p.wheelchair).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          render={<Link href="/driver-shifts" aria-label="Back to shifts" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title="Unassigned participants"
          description="Members without a scheduled shift. Review ranked driver matches and assign."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unassigned" value={unassigned.length} icon={Users} />
        <StatCard label="Wheelchair" value={withNeeds} icon={AlertTriangle} tone="warning" />
        <StatCard label="Active shifts" value={shifts.filter((s: DriverShift) => s.status !== "cancelled").length} icon={Clock} />
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search participants…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {unassigned.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Check className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Everyone is assigned</p>
          <p className="text-sm text-muted-foreground">
            No unassigned participants match your search.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {unassigned.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              recommendations={recommendDrivers(p, shifts)}
              onAssign={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      <AssignDialog
        participant={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onConfirm={(shiftId, participantId) => {
          assignParticipant(shiftId, participantId);
          setSelected(null);
        }}
      />
    </div>
  );
}

function ParticipantCard({
  participant,
  recommendations,
  onAssign,
}: {
  participant: ShiftParticipant;
  recommendations: DriverRecommendation[];
  onAssign: () => void;
}) {
  const top = recommendations.slice(0, 3);
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{participant.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{participant.destination}</span>
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {to12h(participant.pickupTime)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {participant.wheelchair ? (
          <Badge variant="secondary" className="text-xs">Wheelchair</Badge>
        ) : null}
        <Badge variant="secondary" className="text-xs">{participant.requiredVehicleType}</Badge>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">Top driver matches</p>
        {top.map((rec) => (
          <div key={rec.driver.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <Star className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{rec.driver.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {rec.seatsAvailable} seat{rec.seatsAvailable === 1 ? "" : "s"}
              </span>
              <MatchScoreBadge score={rec.match.score} eligible={rec.match.eligible} />
            </span>
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onAssign}>
        Assign driver
      </Button>
    </Card>
  );
}

function AssignDialog({
  participant,
  onOpenChange,
  onConfirm,
}: {
  participant: ShiftParticipant | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (shiftId: string, participantId: string) => void;
}) {
  const { shifts } = useDriverShifts();
  const recommendations = useMemo(
    () => (participant ? recommendDrivers(participant, shifts) : []),
    [participant, shifts],
  );

  return (
    <Dialog open={!!participant} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {participant?.name}</DialogTitle>
          <DialogDescription>
            Drivers ranked by match score. Only shifts with room and a compatible
            window can accept this participant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {recommendations.map((rec) => {
            const shift = shifts.find(
              (s: DriverShift) => s.driverId === rec.driver.id && s.status !== "cancelled",
            );
            const conflict =
              participant && shift ? assignmentConflict(participant, shift) : null;
            const blocked = !shift || conflict?.severity === "error";
            return (
              <div
                key={rec.driver.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{rec.driver.name}</span>
                    <MatchScoreBadge score={rec.match.score} eligible={rec.match.eligible} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {shift
                      ? `${shift.name} · ${to12h(shift.startTime)}–${to12h(shift.endTime)} · ${rec.seatsAvailable} seat${rec.seatsAvailable === 1 ? "" : "s"}`
                      : "No active shift for this driver"}
                  </p>
                  {conflict ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="size-3 shrink-0" />
                      {conflict.message}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant={blocked ? "outline" : "default"}
                  disabled={blocked}
                  onClick={() =>
                    shift && participant && onConfirm(shift.id, participant.id)
                  }
                >
                  Assign
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

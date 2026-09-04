"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Search,
  Truck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDriverShifts } from "@/lib/driver-shifts/store";
import {
  assignmentConflict,
  describeRecurrence,
  detectShiftConflicts,
  matchParticipantToShift,
  to12h,
} from "@/lib/driver-shifts/logic";
import {
  SHIFT_PARTICIPANTS,
  findDriver,
  findParticipant,
  findVehicle,
} from "@/lib/driver-shifts/mock-data";
import { ShiftStatusBadge } from "@/components/driver-shifts/shift-block";
import { MatchScoreBadge } from "@/components/driver-shifts/match-score";

export default function ShiftDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getShift, shifts, assignParticipant, removeParticipant, reorderStops } = useDriverShifts();
  const shift = getShift(id);
  const [query, setQuery] = useState("");

  if (!shift) notFound();

  const driver = findDriver(shift.driverId);
  const vehicle = findVehicle(shift.vehicleId);
  const conflicts = useMemo(() => detectShiftConflicts(shift, shifts), [shift, shifts]);

  const assignedIds = new Set(shift.stops.map((s) => s.participantId));

  // Candidate list: participants not yet on this shift, scored + sorted.
  const candidates = useMemo(() => {
    return SHIFT_PARTICIPANTS.filter((p) => !assignedIds.has(p.id))
      .filter((p) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return `${p.name} ${p.code} ${p.destination}`.toLowerCase().includes(q);
      })
      .map((p) => ({
        participant: p,
        match: matchParticipantToShift(p, shift, vehicle, driver, shift.stops.length),
        conflict: assignmentConflict(p, shift),
      }))
      .sort((a, b) => {
        if (a.match.eligible !== b.match.eligible) return a.match.eligible ? -1 : 1;
        return b.match.score - a.match.score;
      });
  }, [query, shift, vehicle, driver, assignedIds]);

  const seatsLeft = shift.capacity - shift.stops.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/driver-shifts"
          className="mb-2 -ml-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to shifts
        </Link>
        <PageHeader
          title={shift.name}
          description={describeRecurrence(shift.recurrence, shift.startDate, shift.endDate)}
          actions={<ShiftStatusBadge status={shift.status} />}
        />
      </div>

      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift window</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {to12h(shift.startTime)} - {to12h(shift.endTime)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
            <Users className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Driver</p>
            <p className="text-sm font-semibold text-foreground">{driver?.name ?? "Unassigned"}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Truck className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vehicle</p>
            <p className="text-sm font-semibold text-foreground">{vehicle?.name ?? "Unassigned"}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <div className={cn("flex size-9 items-center justify-center rounded-lg", seatsLeft > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
            <UserPlus className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Capacity</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {shift.stops.length}/{shift.capacity} · {seatsLeft} open
            </p>
          </div>
        </Card>
      </div>

      {conflicts.length > 0 ? (
        <Card className="flex flex-col gap-2 border-destructive/40 bg-destructive/5 p-3">
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>{c.message}</span>
            </div>
          ))}
        </Card>
      ) : null}

      {/* 3-column mapping: assigned stops · route order · candidates */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Column 1: assigned participants */}
        <Card className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Assigned Participants</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {shift.stops.length}
            </span>
          </div>
          {shift.stops.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No participants assigned yet. Add them from the candidate list.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shift.stops.map((stop, idx) => {
                const p = findParticipant(stop.participantId);
                return (
                  <li key={stop.participantId} className="rounded-md border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{p?.name ?? stop.participantId}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {stop.pickupAddress}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {to12h(stop.pickupTime)} → {to12h(stop.dropoffTime)} · {stop.destination}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={idx === 0}
                        onClick={() => reorderStops(shift.id, idx, idx - 1)}
                        aria-label="Move earlier"
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={idx === shift.stops.length - 1}
                        onClick={() => reorderStops(shift.id, idx, idx + 1)}
                        aria-label="Move later"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => removeParticipant(shift.id, stop.participantId)}
                        aria-label="Remove"
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Column 2: route order preview */}
        <Card className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Route Order</h3>
          </div>
          {shift.stops.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              The pickup route appears here once participants are assigned.
            </p>
          ) : (
            <ol className="relative flex flex-col gap-0 pl-2">
              {shift.stops.map((stop, idx) => {
                const p = findParticipant(stop.participantId);
                return (
                  <li key={stop.participantId} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="flex size-6 items-center justify-center rounded-full border-2 border-primary bg-background text-[11px] font-semibold text-primary">
                        {idx + 1}
                      </span>
                      {idx < shift.stops.length - 1 ? (
                        <span className="w-0.5 flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-foreground">{p?.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Pickup {to12h(stop.pickupTime)} · ~{stop.travelMinutes} min
                      </p>
                      <p className="text-xs text-muted-foreground">to {stop.destination}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {/* Column 3: candidate participants with match scores */}
        <Card className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add Participants</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {candidates.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <ul className="flex flex-col gap-2">
            {candidates.map(({ participant, match, conflict }) => {
              const blocked = !!conflict && conflict.severity === "error";
              return (
                <li key={participant.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {to12h(participant.pickupTime)} · {participant.destination}
                      </p>
                    </div>
                    <MatchScoreBadge score={match.score} eligible={match.eligible} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {match.factors.map((f) => (
                      <span
                        key={f.key}
                        title={f.detail ?? f.label}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          f.pass ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                  {conflict ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
                      <AlertTriangle className="size-3" /> {conflict.message}
                    </p>
                  ) : null}
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant={blocked ? "outline" : "default"}
                      disabled={blocked}
                      onClick={() => assignParticipant(shift.id, participant.id)}
                    >
                      <UserPlus className="size-4" />
                      Assign
                    </Button>
                  </div>
                </li>
              );
            })}
            {candidates.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No matching participants.
              </p>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}

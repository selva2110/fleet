"use client";

// -----------------------------------------------------------------------------
// Driver Shifts — client store
//
// A lightweight React context that owns all prototype state (shifts + their
// participant assignments) and exposes mutations. Lives at the driver-shifts
// route-group layout so state persists as the dispatcher navigates between the
// calendar, shift details and unassigned views. There is no shifts backend
// yet, so state starts empty; swap the initial state + mutations for API
// calls once that service exists — the hook surface can stay identical.
// -----------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DriverShift, ShiftStop } from "./types";
import { useShiftParticipants } from "./hooks";
import { deriveStatus, stopFromParticipant } from "./logic";

const INITIAL_SHIFTS: DriverShift[] = [];

interface ShiftsContextValue {
  shifts: DriverShift[];
  getShift: (id: string) => DriverShift | undefined;
  upsertShift: (shift: DriverShift) => void;
  cancelShift: (id: string) => void;
  deleteShift: (id: string) => void;
  assignParticipant: (shiftId: string, participantId: string) => void;
  removeParticipant: (shiftId: string, participantId: string) => void;
  reorderStops: (shiftId: string, from: number, to: number) => void;
  /** Participant IDs not assigned to any non-cancelled shift. */
  unassignedParticipantIds: string[];
}

const ShiftsContext = createContext<ShiftsContextValue | null>(null);

export function DriverShiftsProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<DriverShift[]>(INITIAL_SHIFTS);
  const { participants } = useShiftParticipants();

  const withDerivedStatus = useCallback((next: DriverShift[]): DriverShift[] => {
    return next.map((s) => ({ ...s, status: deriveStatus(s, next) }));
  }, []);

  const getShift = useCallback((id: string) => shifts.find((s) => s.id === id), [shifts]);

  const upsertShift = useCallback((shift: DriverShift) => {
    // No shifts backend exists yet — log what would be saved instead of
    // holding it in local state, which would just fake persistence.
    console.log("upsertShift", shift);
  }, []);

  const cancelShift = useCallback((id: string) => {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled" } : s)));
  }, []);

  const deleteShift = useCallback((id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const assignParticipant = useCallback(
    (shiftId: string, participantId: string) => {
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return;
      const stop: ShiftStop = stopFromParticipant(participant);
      setShifts((prev) => {
        const next = prev.map((s) => {
          if (s.id !== shiftId) return s;
          if (s.stops.some((st) => st.participantId === participantId)) return s;
          const stops = [...s.stops, stop].sort(
            (a, b) => a.pickupTime.localeCompare(b.pickupTime),
          );
          return { ...s, stops };
        });
        return withDerivedStatus(next);
      });
    },
    [participants, withDerivedStatus],
  );

  const removeParticipant = useCallback(
    (shiftId: string, participantId: string) => {
      setShifts((prev) => {
        const next = prev.map((s) =>
          s.id === shiftId
            ? { ...s, stops: s.stops.filter((st) => st.participantId !== participantId) }
            : s,
        );
        return withDerivedStatus(next);
      });
    },
    [withDerivedStatus],
  );

  const reorderStops = useCallback(
    (shiftId: string, from: number, to: number) => {
      setShifts((prev) =>
        prev.map((s) => {
          if (s.id !== shiftId) return s;
          const stops = [...s.stops];
          if (from < 0 || from >= stops.length || to < 0 || to >= stops.length) return s;
          const [moved] = stops.splice(from, 1);
          stops.splice(to, 0, moved);
          return { ...s, stops };
        }),
      );
    },
    [],
  );

  const unassignedParticipantIds = useMemo(() => {
    const assigned = new Set<string>();
    for (const s of shifts) {
      if (s.status === "cancelled") continue;
      for (const st of s.stops) assigned.add(st.participantId);
    }
    return participants.filter((p) => !assigned.has(p.id)).map((p) => p.id);
  }, [shifts, participants]);

  const value = useMemo<ShiftsContextValue>(
    () => ({
      shifts,
      getShift,
      upsertShift,
      cancelShift,
      deleteShift,
      assignParticipant,
      removeParticipant,
      reorderStops,
      unassignedParticipantIds,
    }),
    [
      shifts,
      getShift,
      upsertShift,
      cancelShift,
      deleteShift,
      assignParticipant,
      removeParticipant,
      reorderStops,
      unassignedParticipantIds,
    ],
  );

  return <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>;
}

export function useDriverShifts(): ShiftsContextValue {
  const ctx = useContext(ShiftsContext);
  if (!ctx) throw new Error("useDriverShifts must be used within DriverShiftsProvider");
  return ctx;
}

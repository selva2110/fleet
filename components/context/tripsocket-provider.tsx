"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTrips } from "@/lib/trips/hooks";
import { TripsConfig } from "@/lib/trips/config";
import { TripSocketContextType, TripUpdate } from "@/lib/trips/types";

const WS_BASE_URL = process.env.TRIP_SERVICE_URL;
const TripSocketContext = createContext<TripSocketContextType | null>(null);

export function TripSocketProvider({ children }: { children: ReactNode }) {
  const { trips } = useTrips();
  const liveTrips = useMemo(
    () =>
      trips.filter((t) =>
        TripsConfig.LIVE_TRIP_STATUSES.includes(t.status),
      ),
    [trips],
  );

  const [vehicleLocations, setVehicleLocations] = useState<
    Record<string, TripUpdate>
  >({});
  const socketsRef = useRef<Record<string, WebSocket>>({});
  const connectingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!liveTrips.length) {
      Object.values(socketsRef.current).forEach((ws) => {
        ws.close();
      });
      socketsRef.current = {};
      connectingRef.current.clear();
      setVehicleLocations((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    const liveIds = new Set(liveTrips.map((trip) => trip.id));
    liveIds.forEach((tripId) => {
      if (socketsRef.current[tripId] || connectingRef.current.has(tripId)) {
        return;
      }
      connectingRef.current.add(tripId);
      const ws = new WebSocket(
        `wss://dev-tranzio-trip.cdians.com/ws/trips/${tripId}`,
      );
      ws.onopen = () => {
        console.log(`Connected: ${tripId}`);
        connectingRef.current.delete(tripId);
      };

      ws.onmessage = (event) => {
        try {
          const data: TripUpdate = JSON.parse(event.data);
          setVehicleLocations((prev) => ({
            ...prev,
            [tripId]: data,
          }));
        } catch (error) {
          console.error(`Invalid WebSocket message: ${tripId}`, error);
        }
      };
      ws.onerror = (error) => {
        console.error(`WebSocket error: ${tripId}`, error);
      };
      ws.onclose = (event) => {
        console.log(`Disconnected: ${tripId}`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        delete socketsRef.current[tripId];
        connectingRef.current.delete(tripId);
      };
      socketsRef.current[tripId] = ws;
    });

    // Close sockets for trips that are no longer live
    Object.keys(socketsRef.current).forEach((tripId) => {
      if (!liveIds.has(tripId)) {
        socketsRef.current[tripId]?.close();
        delete socketsRef.current[tripId];
        connectingRef.current.delete(tripId);

        setVehicleLocations((prev) => {
          const next = { ...prev };
          delete next[tripId];
          return next;
        });
      }
    });
  }, [liveTrips]);

  // Cleanup when Provider unmounts
  useEffect(() => {
    return () => {
      Object.values(socketsRef.current).forEach((ws) => {
        ws.close();
      });
      socketsRef.current = {};
      connectingRef.current.clear();
    };
  }, []);

  return (
    <TripSocketContext.Provider value={{ vehicleLocations }}>
      {children}
    </TripSocketContext.Provider>
  );
}

export function useTripSockets() {
  const context = useContext(TripSocketContext);
  if (!context) {
    throw new Error("useTripSockets must be used inside TripSocketProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Participant, ParticipantInput } from "./types";
import { ParticipantService } from "./service";

interface ParticipantStore {
  participants: Participant[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getById: (id: string) => Participant | undefined;
  create: (input: ParticipantInput) => Promise<Participant>;
  update: (id: string, input: ParticipantInput) => Promise<Participant>;
  deactivate: (id: string) => Promise<void>;
}

const Ctx = createContext<ParticipantStore | null>(null);

export function ParticipantStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ParticipantService.getParticipants();
      setParticipants(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load participants.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getById = useCallback(
    (id: string) => participants.find((p) => p.id === id),
    [participants],
  );

  const create = useCallback(async (input: ParticipantInput) => {
    const created = await ParticipantService.createParticipant(input);
    setParticipants((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, input: ParticipantInput) => {
    const updated = await ParticipantService.updateParticipant(id, input);
    setParticipants((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deactivate = useCallback(async (id: string) => {
    const updated = await ParticipantService.deactivateParticipant(id);
    setParticipants((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const value = useMemo<ParticipantStore>(
    () => ({
      participants,
      isLoading,
      error,
      reload,
      getById,
      create,
      update,
      deactivate,
    }),
    [participants, isLoading, error, reload, getById, create, update, deactivate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParticipantStore(): ParticipantStore {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useParticipantStore must be used within a ParticipantStoreProvider",
    );
  return ctx;
}

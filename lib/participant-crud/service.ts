import type { Participant, ParticipantInput } from "./types";
import { seedParticipants } from "./mock-data";

// -------------------------------------------------------------------------
// Participant service abstraction.
//
//   UI  ->  ParticipantService  ->  mock data (module singleton)
//
// Every method returns a Promise and simulates network latency so the UI's
// loading/error states are exercised. Swapping this file's body for real
// `fetch` calls to `process.env.NEXT_PUBLIC_API_URL` later requires no UI
// changes — the method signatures are the contract.
// -------------------------------------------------------------------------

let store: Participant[] | null = null;

function db(): Participant[] {
  if (store === null) store = seedParticipants();
  return store;
}

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function genId(): string {
  return `p-${Math.random().toString(36).slice(2, 8)}`;
}

export const ParticipantService = {
  async getParticipants(): Promise<Participant[]> {
    return delay(clone(db()));
  },

  async getParticipant(id: string): Promise<Participant | null> {
    const found = db().find((p) => p.id === id) ?? null;
    return delay(found ? clone(found) : null);
  },

  async createParticipant(input: ParticipantInput): Promise<Participant> {
    const created: Participant = {
      ...clone(input),
      id: genId(),
      createdAt: new Date().toISOString(),
    };
    db().unshift(created);
    return delay(clone(created));
  },

  async updateParticipant(
    id: string,
    input: ParticipantInput,
  ): Promise<Participant> {
    const list = db();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Participant ${id} not found`);
    const updated: Participant = {
      ...list[idx],
      ...clone(input),
      id,
    };
    list[idx] = updated;
    return delay(clone(updated));
  },

  async deactivateParticipant(id: string): Promise<Participant> {
    const list = db();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Participant ${id} not found`);
    list[idx] = { ...list[idx], status: "INACTIVE" };
    return delay(clone(list[idx]));
  },
};

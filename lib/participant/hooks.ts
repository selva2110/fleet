"use client";

import useSWR, { useSWRConfig } from "swr";
import { getParticipants } from "@/app/actions/data";
import {
  saveParticipant as saveParticipantAction,
  deleteParticipant as deleteParticipantAction,
} from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { Participant, ParticipantInput } from "./types";

export const PARTICIPANTS_KEY = "participants";

const EMPTY_PARTICIPANTS: Participant[] = [];

export function useParticipants() {
  const { data, isLoading, mutate } = useSWR<Participant[]>(PARTICIPANTS_KEY, getParticipants);
  return { participants: data ?? EMPTY_PARTICIPANTS, isLoading, mutate };
}

export function useParticipantMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveParticipant(input: ParticipantInput & { id?: string }) {
    await saveParticipantAction(input, role);
    await mutate(PARTICIPANTS_KEY);
  }

  async function deleteParticipant(id: string, name: string) {
    await deleteParticipantAction(id, name, role);
    await mutate(PARTICIPANTS_KEY);
  }

  return { saveParticipant, deleteParticipant };
}

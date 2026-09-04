"use client";

import useSWR, { useSWRConfig } from "swr";
import { getParticipants, getParticipantsReports } from "@/app/actions/data";
import {
  saveParticipant as saveParticipantAction,
  deleteParticipant as deleteParticipantAction,
  saveParticipantMedReport as saveParticipantMedReportAction,
} from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import {
  Participant,
  ParticipantInput,
  ParticipantListResponse,
  ParticipantMedMealReport,
  ParticipantMedMealReportItem,
  ParticipantQueryParams,
} from "./types";

export const PARTICIPANTS_KEY = "participants";
export const PARTICIPANT_REPORTS_KEY = "participant-reports";

const EMPTY_PARTICIPANTS: Participant[] = [];
const EMPTY_PARTICIPANT_REPORTS: ParticipantMedMealReportItem[] = [];

export function useParticipants(params: ParticipantQueryParams = {}) {
  const key: [string, ParticipantQueryParams?] = [PARTICIPANTS_KEY, params];
  const { data, isLoading, mutate } = useSWR<ParticipantListResponse, Error>(
    key,
    async ([, queryParams]: [string, ParticipantQueryParams?]) =>
      (await getParticipants()) as ParticipantListResponse,
  );
  return {
    participants: data?.data ?? EMPTY_PARTICIPANTS,
    pagination: data
      ? {
          page: data.metadata?.pageNumber ?? 0,
          limit: data.metadata?.pageSize ?? 0,
          total: data.metadata?.totalElements ?? 0,
          totalPages: data.metadata?.totalPages ?? 0,
        }
      : undefined,
    isLoading,
    mutate,
  };
}

export function useParticipantReports() {
  const { data, isLoading, mutate } = useSWR<ParticipantMedMealReportItem[], Error>(
    PARTICIPANT_REPORTS_KEY,
    async () => (await getParticipantsReports()) as ParticipantMedMealReportItem[],
  );
  return {
    reports: data ?? EMPTY_PARTICIPANT_REPORTS,
    isLoading,
    mutate,
  };
}

function isParticipantKey(key: unknown) {
  return Array.isArray(key) && key[0] === PARTICIPANTS_KEY;
}

export function useParticipantMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveParticipant(input: ParticipantInput & { id?: string }) {
    await saveParticipantAction(input, role);
    await mutate(isParticipantKey);
  }

  async function saveParticipantMedReport(input: ParticipantMedMealReport) {
    await saveParticipantMedReportAction(input, role);
    await mutate(PARTICIPANT_REPORTS_KEY);
  }

  async function deleteParticipant(id: string, name: string) {
    await deleteParticipantAction(id, name, role);
    await mutate(isParticipantKey);
  }

  return { saveParticipant, deleteParticipant, saveParticipantMedReport };
}

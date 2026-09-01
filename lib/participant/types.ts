import { LatLng } from "../types";

export interface TransportConstraints {
  wheelchair?: boolean;
  caregiverRequired?: boolean;
  oxygen?: boolean;
}

interface contactDetails {
  name: string;
  phone: string;
  address: string;
  location: LatLng | null;
  relation: string;
}

export interface Participant {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  emergencyContactDetails: contactDetails;
  companionNeeded: boolean;
  companionDetails: contactDetails;
  address: string;
  location: LatLng;
  medicalNotes: string;
  constraints: TransportConstraints;
  maxTravelMinutes: number;
  routeNotes: string;
  status: ParticipantStatus;
  eventId: string | null;
}

export type ParticipantStatus =
  | "registered"
  | "scheduled"
  | "vehicle-assigned"
  | "driver-assigned"
  | "driver-approaching"
  | "picked-up"
  | "dropped-off"
  | "completed";

export interface UnassignedParticipant {
  participantId: string;
  reason: string;
}

export type ParticipantInput = Omit<
  Participant,
  "id" | "location" | "status"
> & {
  location?: Participant["location"];
  status?: Participant["status"];
};

export interface ParticipantResponse extends Omit<Participant, "eventId"> {
  eventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantListResponse {
  data: ParticipantResponse[];
  total: number;
}

export interface ParticipantResponseRow {
  event_participant_id: number;
  event_id: string;
  participant_id: string;
  is_participant: string;
  created_at: string;
}

export type ParticipantForm = Omit<
  Participant,
  "id" | "status" | "location"
> & {
  location: Participant["location"] | null;
};

export type ParticipantCreateInput = Omit<Participant, "id"> & { id?: string };

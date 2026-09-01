import { FleetEvent } from "../events/types";
import { SmsNotification, SmsResponseCode } from "../notification/types";
import { Participant } from "../participant/types";

export type ResponseFilter = 'all' | SmsResponseCode | 'none'
export type DeliveryFilter = 'all' | 'delivered' | 'pending' | 'failed' | 'replied'

export interface PartResponseRow {
  key: string
  participant: Participant
  event: FleetEvent
  notif: SmsNotification | null
}
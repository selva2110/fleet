// SMS program-notification response captured from a participant reply.
//   1 -> attending with own transport
//   2 -> attending and requires transport

import { DomainEvent } from "../events/types";

//   3 -> not attending
export type SmsResponseCode =
  | 'attending_self'
  | 'attending_transport'
  | 'not_attending'

export type SmsDeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'received'

export interface SmsNotification {
  id: string
  eventId: string
  participantId: string
  phone: string
  messageSid: string | null
  deliveryStatus: SmsDeliveryStatus
  response: SmsResponseCode | null
  responseBody: string | null
  respondedAt: string | null
  sentAt: string
  updatedAt: string
}

export interface SendNotificationsResult {
  eventId: string
  recipients: number
  message: string
}

export interface ReminderSweepResult {
  processedEvents: number
  remindersFired: number
}

export interface DomainEventLogRow {
  id: number
  eventType:  DomainEvent["eventType"]
  aggregateType: DomainEvent["aggregateType"]
  aggregateId: string
  actorRole: string
  summary: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface SendNotificationsResponse {
  configured: boolean
  total: number
  sent: number
  failed: number
  skipped: number
  message: string
}
export interface ReminderResult {
  configured: boolean
  processedEvents: number
  reminders: number
  sent: number
  message: string
}


export type NotificationKind = 'info' | 'success' | 'warning' | 'danger'

export interface AppNotification {
  id: string
  title: string
  message: string
  kind: NotificationKind
  createdAt: string
}

export interface NotificationContextValue {
  notifications: AppNotification[]
  toasts: AppNotification[]
  addNotification: (input: Omit<AppNotification, 'id' | 'createdAt'>) => void
  addToast: (input: Omit<AppNotification, 'id' | 'createdAt'>) => void
  dismissNotification: (id: string) => void
  dismissToast: (id: string) => void
  clearNotifications: () => void
}

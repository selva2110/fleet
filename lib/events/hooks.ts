"use client";

import useSWR, { useSWRConfig } from "swr";
import {
  getCenters,
  getEvents,
  getEventLogRows,
  getSmsNotifications,
} from "@/app/actions/data";
import {
  saveEvent as saveEventAction,
  deleteEvent as deleteEventAction,
  rescheduleEvent as rescheduleEventAction,
} from "@/app/actions/crud";
import {
  sendEventNotifications as sendEventNotificationsAction,
  assignTransportForResponders as assignTransportAction,
  processDueReminders as processDueRemindersAction,
} from "@/app/actions/notifications";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { PARTICIPANTS_KEY } from "@/lib/participant/hooks";
import { SmsNotification } from "@/lib/notification/types";
import { Center, DomainEvent, EventInput, FleetEvent } from "./types";

export const CENTERS_KEY = "centers";
export const EVENTS_KEY = "events";
export const EVENT_LOG_KEY = "eventLog";
export const SMS_NOTIFICATIONS_KEY = "smsNotifications";

const EMPTY_CENTERS: Center[] = [];
const EMPTY_EVENTS: FleetEvent[] = [];
const EMPTY_EVENT_LOG: DomainEvent[] = [];
const EMPTY_SMS_NOTIFICATIONS: SmsNotification[] = [];

export function useCenters() {
  const { data, isLoading, mutate } = useSWR(CENTERS_KEY, getCenters);
  return { centers: data ?? EMPTY_CENTERS, isLoading, mutate };
}

export function useEvents() {
  const { data, isLoading, mutate } = useSWR<FleetEvent[]>(EVENTS_KEY, getEvents);
  return { events: data ?? EMPTY_EVENTS, isLoading, mutate };
}

// eventLog and SMS responses change from actions outside this tab too
// (driver/participant activity), so poll them every 10s like the old
// fleet-provider did — but only for pages that actually render this hook.
export function useEventLog() {
  const { data, isLoading, mutate } = useSWR(EVENT_LOG_KEY, getEventLogRows, {
    refreshInterval: 10000,
  });
  return { eventLog: data ?? EMPTY_EVENT_LOG, isLoading, mutate };
}

export function useSmsNotifications(events: FleetEvent[]) {
  const { data, isLoading, mutate } = useSWR(
    events.length ? [SMS_NOTIFICATIONS_KEY, events] : null,
    ([, evts]) => getSmsNotifications(evts as FleetEvent[]),
    { refreshInterval: 10000 },
  );
  return { smsNotifications: data ?? EMPTY_SMS_NOTIFICATIONS, isLoading, mutate };
}

export function useEventMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveEvent(input: EventInput & { id?: string }) {
    await saveEventAction(input, role);
    await Promise.all([mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function deleteEvent(id: string, name: string) {
    await deleteEventAction(id, name, role);
    await Promise.all([mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  // Optimistic: reflects the new date immediately (drag-and-drop reschedule),
  // then reconciles with the server.
  async function rescheduleEvent(id: string, newDate: string) {
    await mutate(
      EVENTS_KEY,
      (current?: FleetEvent[]) =>
        current?.map((e) => (e.id === id ? { ...e, date: newDate } : e)),
      { revalidate: false },
    );
    await rescheduleEventAction(id, newDate, role);
    await Promise.all([mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  return { saveEvent, deleteEvent, rescheduleEvent };
}

export function useNotificationActions() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function sendEventNotifications(eventId: string) {
    const result = await sendEventNotificationsAction(eventId, role);
    await Promise.all([
      mutate(EVENTS_KEY),
      mutate(SMS_NOTIFICATIONS_KEY),
      mutate(EVENT_LOG_KEY),
    ]);
    return result;
  }

  async function assignTransport(eventId: string) {
    const result = await assignTransportAction(eventId, role);
    await Promise.all([
      mutate(PARTICIPANTS_KEY),
      mutate(EVENTS_KEY),
      mutate(EVENT_LOG_KEY),
    ]);
    return result;
  }

  async function processDueReminders() {
    const result = await processDueRemindersAction(new Date(), role);
    await Promise.all([mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
    return result;
  }

  return { sendEventNotifications, assignTransport, processDueReminders };
}

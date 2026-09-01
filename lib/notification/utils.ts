import { FleetEvent } from "../events/types";
import { SmsResponseCode } from "./types";

export class NotificationUtils {
  static parseSmsResponse(body: string): SmsResponseCode | null {
    const text = body.trim().toLowerCase();
    const firstChar = text.charAt(0);
    if (firstChar === "1") return "attending_self";
    if (firstChar === "2") return "attending_transport";
    if (firstChar === "3") return "not_attending";
    if (/\bown\b/.test(text)) return "attending_self";
    if (/\btransport|ride|pick ?up\b/.test(text)) return "attending_transport";
    if (/\bno\b|not attending|can'?t|cannot/.test(text)) return "not_attending";
    return null;
  }

  static eventStartDateTime(
    event: Pick<FleetEvent, "date" | "startTime">,
  ): Date | null {
    if (!event.date || !event.startTime) return null;
    const [h, m] = event.startTime
      .split(":")
      .map((p) => Number.parseInt(p, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const [y, mo, d] = event.date.split("-").map((p) => Number.parseInt(p, 10));
    if ([y, mo, d].some(Number.isNaN)) return null;
    return new Date(y, mo - 1, d, h, m, 0, 0);
  }

    static eventEndDateTime(
    event: Pick<FleetEvent, "date" | "endTime">,
  ): Date | null {
    if (!event.date || !event.endTime) return null;
    const [h, m] = event.endTime
      .split(":")
      .map((p) => Number.parseInt(p, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const [y, mo, d] = event.date.split("-").map((p) => Number.parseInt(p, 10));
    if ([y, mo, d].some(Number.isNaN)) return null;
    return new Date(y, mo - 1, d, h, m, 0, 0);
  }

  static responseCutoff(event: FleetEvent): Date | null {
    const start = NotificationUtils.eventStartDateTime(event);
    if (!start) return null;
    const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (!Number.isNaN(deadline.getTime())) {
        return deadline < oneHourBefore ? deadline : oneHourBefore;
      }
    }
    return oneHourBefore;
  }

  static isResponseWindowOpen(
    event: FleetEvent,
    now: Date = new Date(),
  ): boolean {
    const cutoff = NotificationUtils.responseCutoff(event);
    if (!cutoff) return false;
    return now.getTime() < cutoff.getTime();
  }

  static buildNotificationMessage(params: {
    eventName: string;
    centerName: string;
    date: string;
    startTime: string;
    cutoff: Date | null;
    reminder?: boolean;
  }): string {
    const { eventName, centerName, date, startTime, cutoff, reminder } = params;
    const when = cutoff
      ? cutoff.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
    const lines = [
      `${reminder ? "REMINDER — " : ""}PACE Program: ${eventName}`,
      `${date} at ${startTime}${centerName ? ` · ${centerName}` : ""}`,
      "Reply:",
      "1 = Attending (own transport)",
      "2 = Attending (need transport)",
      "3 = Not attending",
    ];
    if (when) lines.push(`Please reply by ${when}.`);
    return lines.join("\n");
  }

  static createNotificationId() {
    return `notif-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  }
}

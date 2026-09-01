import { todayLocalDate } from "../date";
import { FleetEvent } from "./types";

export class EventUtils {
  static blankEvent(centerId: string): Omit<FleetEvent, "id"> {
    return {
      name: "",
      type: "Clinical Appointment",
      centerId,
      date: todayLocalDate(),
      startTime: "09:00",
      endTime: "12:00",
      expectedAttendance: 0,
      participantIds: [],
      reminders: [],
      registrationDeadline: null,
      roundTrip: false,
      returnTime: null,
      status: "draft",
    };
  }

  static toCsv(rows: string[][]): string {
    return rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
  }

  static downloadCsv(filename: string, rows: string[][]) {
    const blob = new Blob([EventUtils.toCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static isoToLocalInput(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  static localInputToIso(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  static centerIconMarkup() {
    return `
    <div class="map-marker" style="width:30px;height:30px;background:#0f172a;border-radius:8px;">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
        <path d="M10 4v12M4 10h12" />
      </svg>
    </div>`;
  }
}

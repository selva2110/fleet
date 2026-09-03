import { DriversConfig } from "./config";
import {
  Driver,
  DriverAvailability,
  DriverForm,
  LeaveRecord,
  LeaveStatus,
} from "./types";

export class DriverUtils {
  static timeToMinutes(t: string | null | undefined): number {
    if (typeof t !== "string") return 0;

    const [hStr, mStr] = t.trim().split(":");
    const h = Number(hStr);
    const m = Number(mStr);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  }

  static dayOfWeekFromDate(dateStr: string | null | undefined): number {
    if (typeof dateStr !== "string") return 0;

    const normalized = dateStr.trim().split(/[T ]/)[0];
    const [yStr, mStr, dStr] = normalized.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);

    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
      return 0;

    const safeMonth = Math.min(Math.max(m, 1), 12);
    const safeDay = Math.min(Math.max(d, 1), 31);
    return new Date(y, safeMonth - 1, safeDay).getDay();
  }

  static timeWithinShift(
    shiftStartMin: number,
    shiftEndMin: number,
    t: number,
  ): boolean {
    if (shiftStartMin <= shiftEndMin)
      return t >= shiftStartMin && t <= shiftEndMin;
    return t >= shiftStartMin || t <= shiftEndMin;
  }

  static isDriverOnShift(
    driver: Driver,
    eventDate: string,
    eventStartTime: string,
  ): boolean {
    return (
      Boolean(
        driver.shiftDays?.includes(DriverUtils.dayOfWeekFromDate(eventDate)),
      ) &&
      DriverUtils.timeWithinShift(
        DriverUtils.timeToMinutes(driver.shiftStart),
        DriverUtils.timeToMinutes(driver.shiftEnd),
        DriverUtils.timeToMinutes(eventStartTime),
      )
    );
  }

  static blankDriver(): DriverForm {
    return {
      name: "",
      mobile_number: "",
      phone: "",
      address: "",
      blood_group: "",
      location: null,
      dial_code: "+1",
      license_number: "",
      certifications: {
        wheelchairAssist: { enabled: false, certificateNo: "" },
        medicalTransport: { enabled: false, certificateNo: "" },
        cprCert: { enabled: false, certificateNo: "" },
        nemCert: { enabled: false, certificateNo: "" },
      },
      assignedVehicleId: null,
      rating: 4.5,
      shiftStart: "08:00",
      shiftEnd: "16:00",
      shiftDays: [1, 2, 3, 4, 5],
      imageUrl: null,
    };
  }

  static toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static addDaysIso(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return DriverUtils.toIsoDate(d);
  }

  static startOfMonthIso(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return DriverUtils.toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  static endOfMonthIso(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return DriverUtils.toIsoDate(
      new Date(d.getFullYear(), d.getMonth() + 1, 0),
    );
  }

  static worstStatus(records: LeaveRecord[]): LeaveStatus | null {
    if (!records.length) return null;
    return records.reduce<LeaveStatus>(
      (worst, r) =>
        DriversConfig.STATUS_SEVERITY[r.status] >
        DriversConfig.STATUS_SEVERITY[worst]
          ? r.status
          : worst,
      records[0].status,
    );
  }

  static monthsBetween(
    start: string,
    end: string,
    max: number,
  ): { year: number; month: number }[] {
    const startD = new Date(`${start}T00:00:00`);
    const endD = new Date(`${end}T00:00:00`);
    const months: { year: number; month: number }[] = [];
    let y = startD.getFullYear();
    let m = startD.getMonth();
    while (
      (y < endD.getFullYear() ||
        (y === endD.getFullYear() && m <= endD.getMonth())) &&
      months.length < max
    ) {
      months.push({ year: y, month: m });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return months;
  }

  static buildMonthGrid(
    year: number,
    month: number,
  ): { date: string; inMonth: boolean }[][] {
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string; inMonth: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--)
      cells.push({
        date: DriverUtils.toIsoDate(new Date(year, month, 1 - i)),
        inMonth: false,
      });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({
        date: DriverUtils.toIsoDate(new Date(year, month, d)),
        inMonth: true,
      });
    while (cells.length % 7 !== 0)
      cells.push({
        date: DriverUtils.addDaysIso(cells[cells.length - 1].date, 1),
        inMonth: false,
      });
    const weeks: { date: string; inMonth: boolean }[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  // One grid block per calendar month the range touches, so multi-month
  // ranges render as separate month grids instead of one blended week row.
  // A cell is `inMonth` only when it belongs to that block's calendar month
  // AND falls inside the selected range.
  static buildMonthBlocks(
    start: string,
    end: string,
  ): {
    year: number;
    month: number;
    weeks: { date: string; inMonth: boolean }[][];
  }[] {
    const safeStart = Number.isNaN(new Date(`${start}T00:00:00`).getTime())
      ? DriverUtils.toIsoDate(new Date())
      : start;
    const safeEnd = Number.isNaN(new Date(`${end}T00:00:00`).getTime())
      ? safeStart
      : end;
    const effectiveEnd = safeEnd < safeStart ? safeStart : safeEnd;

    const months = DriverUtils.monthsBetween(
      safeStart,
      effectiveEnd,
      DriversConfig.MAX_MONTHS,
    );

    return months.map(({ year, month }) => ({
      year,
      month,
      weeks: DriverUtils.buildMonthGrid(year, month).map((week) =>
        week.map((cell) => ({
          date: cell.date,
          inMonth:
            cell.inMonth && cell.date >= safeStart && cell.date <= effectiveEnd,
        })),
      ),
    }));
  }

  static entryAvailability(
    entry: DriverAvailability,
  ): "available" | "pending" | "unavailable" {
    if (entry.unavailableDates.some((u) => u.status === "APPROVED"))
      return "unavailable";
    if (entry.unavailableDates.some((u) => u.status === "PENDING"))
      return "pending";
    return "available";
  }
}

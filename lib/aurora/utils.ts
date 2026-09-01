import { Entry, Placed } from "./types";

export class AuroraUtils {
  static ymd(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  static toMin(hhmm: string | null | undefined) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h)) return null;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
  }

  static to12h(hhmm: string) {
    if (!hhmm.includes(":")) {
      return hhmm;
    }
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  }

  static hourLabel(h: number) {
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour} ${period}`;
  }

  static packColumns(items: Entry[]): Placed[] {
    const sorted = [...items].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );
    const result: Placed[] = [];
    let cluster: Placed[] = [];
    let clusterEnd = -1;
    let colEnds: number[] = [];

    const flush = () => {
      if (!cluster.length) return;
      const cols = Math.max(...cluster.map((c) => c.col)) + 1;
      cluster.forEach((c) => (c.cols = cols));
      result.push(...cluster);
      cluster = [];
      colEnds = [];
    };

    for (const it of sorted) {
      if (cluster.length && it.start >= clusterEnd) flush();
      let col = colEnds.findIndex((e) => e <= it.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(it.end);
      } else {
        colEnds[col] = it.end;
      }
      cluster.push({ ...it, col, cols: 1 });
      clusterEnd = cluster.length === 1 ? it.end : Math.max(clusterEnd, it.end);
    }
    flush();
    return result;
  }

  static seededSeries(
    seed: number,
    points = 18,
    base = 50,
    variance = 34,
  ): number[] {
    let s = Math.floor(seed) % 2147483647;
    if (s <= 0) s += 2147483646;
    const out: number[] = [];
    for (let i = 0; i < points; i++) {
      s = (s * 16807) % 2147483647;
      const r = (s - 1) / 2147483646;
      const wave = Math.sin(i / 2.4) * variance * 0.35;
      out.push(Math.max(3, base + (r - 0.5) * variance + wave));
    }
    return out;
  }

  static startOfWeek(d: Date) {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Monday = 0
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  static dateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

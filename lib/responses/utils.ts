export class PartResponseUtils {
  static randomPastDate(days = 5): string {
    const now = Date.now();
    const past = now - days * 24 * 60 * 60 * 1000;
    return new Date(past + Math.random() * (now - past)).toISOString();
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
    const blob = new Blob([PartResponseUtils.toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

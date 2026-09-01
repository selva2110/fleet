"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CalendarRange,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Loader2,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckboxGroupFilter,
  FilterRail,
  FilterSection,
  ListLayout,
} from "@/components/data-view/data-view";
import { getDriverAvailability } from "@/app/actions/data";
import { cn } from "@/lib/utils";
import { DriversConfig } from "@/lib/driver/config";
import {
  DriverAvailability,
  LeaveRecord,
  LeaveStatus,
} from "@/lib/driver/types";
import { useTranslation } from "@/components/context/language-provider";
import { useNotifications } from "@/components/context/notification-provider";
import { DriverUtils } from "@/lib/driver/utils";
import { DAY_LABEL_KEYS } from "@/components/crud/form-fields";
import { useRouter } from "next/navigation";

type GridCell = {
  date: string;
  inMonth: boolean;
};

type MonthBlock = {
  year: number;
  month: number;
  weeks: GridCell[][];
};

type Segment = {
  key: string;
  driverId: string;
  driverName: string;
  status: LeaveStatus;
  reason: string;
  leaveStart: string;
  leaveEnd: string;
  colStart: number;
  colEnd: number;
  isStart: boolean;
  isEnd: boolean;
  showName: boolean;
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string) {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

export default function DriverAvailabilityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { addToast } = useNotifications();

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => DriverUtils.toIsoDate(today), [today]);

  // ------------------------------------------------------------
  // Calendar mode
  // ------------------------------------------------------------

  const [customRange, setCustomRange] = useState(false);

  // Used only for normal month view
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  // Used only for custom date range
  const [rangeStart, setRangeStart] = useState(() =>
    DriverUtils.startOfMonthIso(todayIso),
  );

  const [rangeEnd, setRangeEnd] = useState(() =>
    DriverUtils.endOfMonthIso(todayIso),
  );

  // ------------------------------------------------------------
  // Data
  // ------------------------------------------------------------

  const [entries, setEntries] = useState<DriverAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const rangeInvalid = customRange && rangeEnd < rangeStart;

  // ------------------------------------------------------------
  // Calendar blocks
  // ------------------------------------------------------------

  const monthBlocks = useMemo<MonthBlock[]>(() => {
    // Normal month view:
    // exactly one month
    if (!customRange) {
      return [
        {
          year: cursor.year,
          month: cursor.month,
          weeks: DriverUtils.buildMonthGrid(cursor.year, cursor.month),
        },
      ];
    }

    // Custom range:
    // build the calendar blocks needed to visually display
    // the selected range.
    if (rangeInvalid) {
      return [];
    }

    return DriverUtils.buildMonthBlocks(rangeStart, rangeEnd);
  }, [customRange, rangeStart, rangeEnd, rangeInvalid, cursor]);

  // ------------------------------------------------------------
  // Calendar grid boundaries
  //
  // These are ONLY for rendering the calendar.
  // They may include days before/after the selected custom range.
  // ------------------------------------------------------------

  const gridStart =
    monthBlocks.length > 0 ? monthBlocks[0].weeks[0][0].date : rangeStart;

  const lastBlock =
    monthBlocks.length > 0 ? monthBlocks[monthBlocks.length - 1] : null;

  const gridEnd = lastBlock
    ? lastBlock.weeks[lastBlock.weeks.length - 1][6].date
    : rangeEnd;

  // ------------------------------------------------------------
  // Actual data range
  //
  // IMPORTANT:
  // In custom mode use the exact dates selected by the user.
  // Do NOT use gridStart/gridEnd because those are week boundaries.
  // ------------------------------------------------------------

  const dataStart = customRange ? rangeStart : gridStart;
  const dataEnd = customRange ? rangeEnd : gridEnd;

  // ------------------------------------------------------------
  // Load availability
  // ------------------------------------------------------------

  useEffect(() => {
    if (rangeInvalid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setLoadError(false);

    getDriverAvailability(dataStart, dataEnd)
      .then((res) => {
        if (!active) return;

        setEntries(res.drivers);
        setLoadError(false);
      })
      .catch(() => {
        if (!active) return;

        setEntries([]);
        setLoadError(true);

        addToast({
          title: t("driver.availabilityloaderrortitle"),
          message: t("driver.availabilityloaderror"),
          kind: "danger",
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dataStart, dataEnd, rangeInvalid]);

  // ------------------------------------------------------------
  // Driver filter options
  // ------------------------------------------------------------

  const driverOptions = useMemo(
    () =>
      [...entries]
        .map((e) => ({
          value: e.driver.id,
          label: e.driver.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [entries],
  );

  // ------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------

  const available = entries.filter(
    (e) => DriverUtils.entryAvailability(e) === "available",
  ).length;

  const onLeave = entries.filter(
    (e) => DriverUtils.entryAvailability(e) === "unavailable",
  ).length;

  const pending = entries.filter(
    (e) => DriverUtils.entryAvailability(e) === "pending",
  ).length;

  const activeFilterCount =
    (statuses.length ? 1 : 0) + (selectedDriverIds.length ? 1 : 0);

  // ------------------------------------------------------------
  // Filter entries
  // ------------------------------------------------------------

  const filteredEntries = useMemo(
    () =>
      selectedDriverIds.length
        ? entries.filter((e) => selectedDriverIds.includes(e.driver.id))
        : entries,
    [entries, selectedDriverIds],
  );

  // ------------------------------------------------------------
  // Visible date range
  //
  // In custom mode this is EXACTLY what the user selected.
  // ------------------------------------------------------------

  const visibleStart = customRange ? rangeStart : gridStart;
  const visibleEnd = customRange ? rangeEnd : gridEnd;

  // ------------------------------------------------------------
  // Per-day records
  // ------------------------------------------------------------

  const dayMap = useMemo(() => {
    const map = new Map<string, LeaveRecord[]>();

    for (const entry of filteredEntries) {
      for (const leave of entry.unavailableDates) {
        if (statuses.length && !statuses.includes(leave.status)) {
          continue;
        }

        if (leave.endDate < leave.startDate) {
          continue;
        }

        let cur = leave.startDate;
        let guard = 0;

        while (cur <= leave.endDate && guard < 3660) {
          // IMPORTANT:
          // In custom mode only include days inside the
          // exact user-selected range.
          if (cur >= visibleStart && cur <= visibleEnd) {
            const list = map.get(cur) ?? [];

            list.push({
              driverId: entry.driver.id,
              driverName: entry.driver.name,
              status: leave.status,
              reason: leave.reason,
              startDate: leave.startDate,
              endDate: leave.endDate,
              ptoId: leave.id,
            });

            map.set(cur, list);
          }

          cur = DriverUtils.addDaysIso(cur, 1);
          guard += 1;
        }
      }
    }

    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          DriversConfig.STATUS_SEVERITY[b.status] -
          DriversConfig.STATUS_SEVERITY[a.status],
      );
    }

    return map;
  }, [filteredEntries, statuses, visibleStart, visibleEnd]);

  // ------------------------------------------------------------
  // Month/week bars
  // ------------------------------------------------------------

  const monthBlockBars = useMemo(() => {
    return monthBlocks.map((block) => {
      const seenInBlock = new Set<string>();

      const weekResults = block.weeks.map((week) => {
        const weekStart = week[0].date;
        const weekEnd = week[6].date;

        const segments: Segment[] = [];

        for (const entry of filteredEntries) {
          for (const leave of entry.unavailableDates) {
            if (statuses.length && !statuses.includes(leave.status)) {
              continue;
            }

            if (leave.endDate < leave.startDate) {
              continue;
            }

            // Do not show leave outside the selected range
            if (
              customRange &&
              (leave.endDate < rangeStart || leave.startDate > rangeEnd)
            ) {
              continue;
            }

            if (leave.endDate < weekStart || leave.startDate > weekEnd) {
              continue;
            }

            let segStart =
              leave.startDate > weekStart ? leave.startDate : weekStart;

            let segEnd = leave.endDate < weekEnd ? leave.endDate : weekEnd;

            // In custom mode clamp the bar to the
            // user's selected range.
            if (customRange) {
              if (segStart < rangeStart) {
                segStart = rangeStart;
              }

              if (segEnd > rangeEnd) {
                segEnd = rangeEnd;
              }
            }

            const colStart = week.findIndex((d) => d.date === segStart);

            const colEnd = week.findIndex((d) => d.date === segEnd);

            if (colStart === -1 || colEnd === -1) {
              continue;
            }

            const leaveKey = `${entry.driver.id}-${leave.id}`;

            const showName = !seenInBlock.has(leaveKey);

            seenInBlock.add(leaveKey);

            segments.push({
              key: `${leaveKey}-${weekStart}`,
              driverId: entry.driver.id,
              driverName: entry.driver.name,
              status: leave.status,
              reason: leave.reason,
              leaveStart: leave.startDate,
              leaveEnd: leave.endDate,
              colStart,
              colEnd,
              isStart: segStart === leave.startDate,
              isEnd: segEnd === leave.endDate,
              showName,
            });
          }
        }

        segments.sort(
          (a, b) =>
            a.colStart - b.colStart ||
            b.colEnd - b.colStart - (a.colEnd - a.colStart),
        );

        const laneEnds: number[] = [];
        const lanes: Segment[][] = [];
        const overflowPerDay = new Array(7).fill(0) as number[];

        for (const seg of segments) {
          let laneIndex = laneEnds.findIndex((end) => end < seg.colStart);

          if (laneIndex === -1) {
            if (lanes.length >= DriversConfig.MAX_EVENT_LANES) {
              for (let d = seg.colStart; d <= seg.colEnd; d++) {
                overflowPerDay[d] += 1;
              }

              continue;
            }

            laneIndex = lanes.length;
            lanes.push([]);
            laneEnds.push(-1);
          }

          laneEnds[laneIndex] = seg.colEnd;
          lanes[laneIndex].push(seg);
        }

        return {
          lanes,
          overflowPerDay,
        };
      });

      return weekResults;
    });
  }, [
    monthBlocks,
    filteredEntries,
    statuses,
    customRange,
    rangeStart,
    rangeEnd,
  ]);

  // ------------------------------------------------------------
  // Month label
  // ------------------------------------------------------------

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  // ------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------

  function resetFilters() {
    setStatuses([]);
    setSelectedDriverIds([]);
  }

  // ------------------------------------------------------------
  // Month navigation
  // ------------------------------------------------------------

  function goToMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1);

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  }

  function goToday() {
    setCursor({
      year: today.getFullYear(),
      month: today.getMonth(),
    });
  }

  // ------------------------------------------------------------
  // Toggle month/custom mode
  // ------------------------------------------------------------

  function toggleRangeMode() {
    setCustomRange((current) => !current);
  }

  // ------------------------------------------------------------
  // Selected day
  // ------------------------------------------------------------

  const selectedDayRecords = selectedDay ? (dayMap.get(selectedDay) ?? []) : [];

  const selectedDayLabel = selectedDay
    ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const LANES = DriversConfig.MAX_EVENT_LANES;

  // ------------------------------------------------------------
  // Driver filter
  // ------------------------------------------------------------

  const driverFilterControl = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Users className="size-4" />

            {t("driver.filterbydriver")}

            {selectedDriverIds.length ? (
              <Badge className="ml-0.5 size-5 justify-center rounded-full bg-primary p-0 text-[10px] text-primary-foreground">
                {selectedDriverIds.length}
              </Badge>
            ) : null}
          </Button>
        }
      />

      <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto">
        {driverOptions.length === 0 ? (
          <p className="px-1.5 py-1 text-sm text-muted-foreground">
            {t("cc.nodrivers")}
          </p>
        ) : (
          driverOptions.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selectedDriverIds.includes(opt.value)}
              onCheckedChange={(checked) =>
                setSelectedDriverIds((prev) =>
                  checked
                    ? [...prev, opt.value]
                    : prev.filter((v) => v !== opt.value),
                )
              }
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t("driver.availability")}
        description={t("driver.availabilitydesc")}
      />

      <div className="flex flex-col gap-6 p-6">
        {/* -------------------------------------------------- */}
        {/* Controls */}
        {/* -------------------------------------------------- */}

        <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex flex-wrap items-center gap-3">
            {!customRange ? (
              // ------------------------------
              // MONTH VIEW
              // ------------------------------
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToMonth(-1)}
                  aria-label={t("driver.previousmonth")}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <Button variant="outline" size="sm" onClick={goToday}>
                  {t("driver.today")}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToMonth(1)}
                  aria-label={t("driver.nextmonth")}
                >
                  <ChevronRight className="size-4" />
                </Button>

                <h2 className="ml-2 text-base font-semibold tabular-nums">
                  {monthLabel}
                </h2>

                {loading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            ) : (
              // ------------------------------
              // CUSTOM DATE RANGE
              // ------------------------------
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-8 w-auto"
                  aria-label={t("driver.startdate")}
                />

                <span className="text-muted-foreground">–</span>

                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-8 w-auto"
                  aria-label={t("driver.enddate")}
                />

                {rangeInvalid ? (
                  <span className="text-xs text-destructive">
                    {t("driver.invaliddaterange")}
                  </span>
                ) : null}

                {loading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            )}

            {driverFilterControl}
          </div>

          {/* Mode toggle */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={toggleRangeMode}
          >
            <CalendarRange className="size-4" />

            {customRange ? t("driver.monthview") : t("driver.customrange")}
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t("driver.totdr")} value={entries.length} icon={Users} />
          <StatCard label={t("driver.fullyavailable")} value={available} icon={UserCheck} tone="success" />
          <StatCard label={t("driver.onleave")} value={onLeave} icon={CalendarX2} tone="danger" />
          <StatCard label={t("driver.pendingrequests")} value={pending} icon={Hourglass} tone="warning" />
        </div>

        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t("common.status")}>
                <CheckboxGroupFilter
                  options={DriversConfig.LEAVE_STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <Card className="overflow-hidden p-4">
            {loadError && !loading ? (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {t("driver.availabilityloaderror")}
              </div>
            ) : null}

            {/* Legend */}
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {DriversConfig.LEAVE_STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      DriversConfig.STATUS_COUNT_CLS[s],
                    )}
                  />

                  {t(DriversConfig.leaveStatusMeta[s].label)}
                </span>
              ))}
            </div>

            {/* Month blocks */}
            {rangeInvalid ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t("driver.invaliddaterange")}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {monthBlocks.map((block, bi) => {
                  const blockLabel = new Date(
                    block.year,
                    block.month,
                    1,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={`${block.year}-${block.month}`}
                      className="flex flex-col overflow-hidden rounded-lg border-t border-l border-border"
                    >
                      {/* Month title only in custom mode */}
                      {customRange ? (
                        <div className="border-r border-b border-border bg-card px-3 py-1.5 text-xs font-semibold">
                          {blockLabel}
                        </div>
                      ) : null}

                      {/* Day headers */}
                      <div className="grid grid-cols-7">
                        {DAY_LABEL_KEYS.map((label) => (
                          <div
                            key={label}
                            className="border-r border-b border-border bg-card px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                          >
                            {t(label)}
                          </div>
                        ))}
                      </div>

                      {/* Weeks */}
                      {block.weeks.map((week, wi) => {
                        const { lanes, overflowPerDay } =
                          monthBlockBars[bi][wi];

                        const hasOverflow = overflowPerDay.some((c) => c > 0);

                        const totalRows = 1 + LANES + (hasOverflow ? 1 : 0);

                        return (
                          <div
                            key={week[0].date}
                            className="relative grid grid-cols-7"
                            style={{
                              gridTemplateRows: `28px repeat(${LANES}, 20px)${
                                hasOverflow ? " 16px" : ""
                              }`,
                            }}
                          >
                            {/* Background */}
                            {week.map((cellData, ci) => (
                              <div
                                key={`bg-${cellData.date}`}
                                className={cn(
                                  "border-r border-b border-border",
                                  !cellData.inMonth && "bg-muted/30",

                                  // In custom mode,
                                  // visually dim dates
                                  // outside selected range.
                                  customRange &&
                                    (cellData.date < rangeStart ||
                                      cellData.date > rangeEnd) &&
                                    "bg-muted/40",
                                )}
                                style={{
                                  gridColumn: ci + 1,
                                  gridRow: `1 / ${totalRows + 1}`,
                                }}
                              />
                            ))}

                            {/* Day numbers */}
                            {week.map((cellData, ci) => {
                              const dayNum = Number(cellData.date.slice(-2));

                              const isToday = cellData.date === todayIso;

                              const outsideCustomRange =
                                customRange &&
                                (cellData.date < rangeStart ||
                                  cellData.date > rangeEnd);

                              const hasRecords =
                                !outsideCustomRange &&
                                (dayMap.get(cellData.date)?.length ?? 0) > 0;

                              return (
                                <button
                                  key={cellData.date}
                                  type="button"
                                  disabled={!hasRecords}
                                  onClick={() => setSelectedDay(cellData.date)}
                                  style={{
                                    gridColumn: ci + 1,
                                    gridRow: 1,
                                  }}
                                  className={cn(
                                    "flex items-center justify-start gap-1 p-1",

                                    hasRecords && "cursor-pointer",

                                    outsideCustomRange &&
                                      "cursor-default opacity-40",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",

                                      isToday
                                        ? "bg-primary font-semibold text-primary-foreground"
                                        : !cellData.inMonth
                                          ? "text-muted-foreground/40"
                                          : "text-foreground",
                                    )}
                                  >
                                    {dayNum}
                                  </span>
                                </button>
                              );
                            })}

                            {/* Leave bars */}
                            {lanes.map((laneSegs, li) =>
                              laneSegs.map((seg) => (
                                <button
                                  key={seg.key}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDay(week[seg.colStart].date)
                                  }
                                  style={{
                                    gridColumn: `${seg.colStart + 1} / ${seg.colEnd + 2}`,
                                    gridRow: li + 2,
                                  }}
                                  className={cn(
                                    "mx-0.5 my-px truncate px-1.5 text-left text-[10px] font-medium leading-5",
                                    DriversConfig.STATUS_COUNT_CLS[seg.status],
                                    seg.isStart
                                      ? "rounded-l"
                                      : "rounded-l-none",
                                    seg.isEnd ? "rounded-r" : "rounded-r-none",
                                  )}
                                >
                                  {seg.showName ? seg.driverName : " "}
                                </button>
                              )),
                            )}

                            {/* Overflow */}
                            {hasOverflow
                              ? week.map((cellData, ci) =>
                                  overflowPerDay[ci] > 0 ? (
                                    <button
                                      key={`more-${cellData.date}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedDay(cellData.date)
                                      }
                                      style={{
                                        gridColumn: ci + 1,
                                        gridRow: LANES + 2,
                                      }}
                                      className="truncate px-1.5 text-left text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                      {t("driver.moreevents").replace(
                                        "{{count}}",
                                        String(overflowPerDay[ci]),
                                      )}
                                    </button>
                                  ) : null,
                                )
                              : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </ListLayout>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Selected day dialog */}
      {/* ---------------------------------------------------- */}

      <Dialog
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDay(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("driver.dayevents").replace("{{date}}", selectedDayLabel)}
            </DialogTitle>
          </DialogHeader>

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {selectedDayRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("driver.nooneonleave")}
              </p>
            ) : (
              selectedDayRecords.map((r, i) => (
                <div
                  key={`${r.driverId}-${i}`}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border p-2.5"
                  onClick={() =>
                    router.push(
                      `/drivers/pto?driverId=${encodeURIComponent(
                        r.driverId,
                      )}&ptoId=${encodeURIComponent(r.ptoId)}`,
                    )
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.driverName}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateRange(r.startDate, r.endDate)}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {r.reason || t("driver.noreason")}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      DriversConfig.STATUS_COUNT_CLS[r.status],
                    )}
                  >
                    {t(DriversConfig.leaveStatusMeta[r.status].label)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

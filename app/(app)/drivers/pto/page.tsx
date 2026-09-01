"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckboxGroupFilter,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  Pagination,
  PageSize,
} from "@/components/data-view/data-view";
import { tableHeaderRow } from "@/components/aurora/aurora-ui";
import { getDriverPto } from "@/app/actions/data";
import { manageLeaveApproval } from "@/app/actions/drivers";
import { formatMonthDayYear } from "@/lib/date";
import { cn, findById } from "@/lib/utils";
import { DriversConfig } from "@/lib/driver/config";
import { DriverPto, LeaveStatus } from "@/lib/driver/types";
import { DriverUtils } from "@/lib/driver/utils";
import { useTranslation } from "@/components/context/language-provider";
import { useDrivers } from "@/lib/driver/hooks";

const DEFAULT_STATUSES: LeaveStatus[] = ["APPROVED", "PENDING"];

type DateFilterMode = "all" | "range";
type ConfirmMode = "approve" | "reject" | "cancel";

export default function DriverPtoPage() {
  const { t } = useTranslation();
  const { drivers } = useDrivers();
  const [driverId, setDriverId] = useState<string>("");
  const [inboundPtoId, setInboundPtoId] = useState<string | null>("");
  const todayIso = useMemo(() => DriverUtils.toIsoDate(new Date()), []);
  const driverOptions = useMemo(
    () =>
      [...drivers]
        .map((d) => ({ value: d.id, label: d.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [drivers],
  );
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [filterRangeStart, setFilterRangeStart] = useState(todayIso);
  const [filterRangeEnd, setFilterRangeEnd] = useState(todayIso);
  const dateRangeInvalid =
    dateFilterMode === "range" && filterRangeEnd < filterRangeStart;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [result, setResult] = useState<{ data: DriverPto[]; total: number }>({
    data: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{
    pto: DriverPto;
    mode: ConfirmMode;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!driverId) {
      setResult({ data: [], total: 0 });
      return;
    }
    const res = await getDriverPto(driverId);
    setResult({ data: res.data, total: res.total });
  }, [driverId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("driverId");
    const pto = sp.get("ptoId");
    if (id) setDriverId(id);
    if (pto) {
      setInboundPtoId(pto);
      const timeout = setTimeout(() => {
        setInboundPtoId(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  function openConfirm(pto: DriverPto, mode: ConfirmMode) {
    setReviewNotes("");
    setConfirmTarget({ pto, mode });
  }

  function closeConfirm() {
    setConfirmTarget(null);
    setReviewNotes("");
  }

  async function submitConfirm() {
    if (!confirmTarget) return;
    const { pto, mode } = confirmTarget;
    const status = mode === "approve" ? "APPROVED" : "REJECTED";
    setActioningId(pto.id);
    try {
      await manageLeaveApproval(driverId, pto.id, status, reviewNotes.trim());
      await refresh();
      closeConfirm();
    } finally {
      setActioningId(null);
    }
  }

  function handleStatusChange(next: string[]) {
    setStatuses(next);
    setPage(1);
  }

  function handleDateFilterModeChange(mode: DateFilterMode) {
    setDateFilterMode(mode);
    if (mode === "range") {
      setFilterRangeStart(todayIso);
      setFilterRangeEnd(todayIso);
    }
    setPage(1);
  }

  function handleFilterRangeStartChange(value: string) {
    if (!value) return;
    setFilterRangeStart(value);
    setPage(1);
  }

  function handleFilterRangeEndChange(value: string) {
    if (!value) return;
    setFilterRangeEnd(value);
    setPage(1);
  }

  function resetFilters() {
    setStatuses(DEFAULT_STATUSES);
    setDateFilterMode("all");
    setFilterRangeStart(todayIso);
    setFilterRangeEnd(todayIso);
    setPage(1);
  }

  const filteredData = useMemo(() => {
    return result.data.filter((pto) => {
      if (statuses.length && !statuses.includes(pto.status)) return false;
      if (
        dateFilterMode === "range" &&
        !dateRangeInvalid &&
        (pto.endDate < filterRangeStart || pto.startDate > filterRangeEnd)
      ) {
        return false;
      }
      return true;
    });
  }, [
    result.data,
    statuses,
    dateFilterMode,
    filterRangeStart,
    filterRangeEnd,
    dateRangeInvalid,
  ]);

  const paginatedData = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page, pageSize],
  );

  const activeFilterCount =
    statuses.length + (dateFilterMode === "range" ? 1 : 0);
  const total = filteredData.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  useEffect(() => {
    if (!inboundPtoId) return;

    const timer = setTimeout(() => {
      selectedRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [paginatedData]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t("driver.ptotitle")}
        description={t("driver.ptodesc")}
      />

      <div className="flex flex-col gap-6 p-6">
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <label className="text-sm font-medium text-muted-foreground">
            {t("common.driver")}
          </label>
          {driverOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cc.nodrivers")}</p>
          ) : (
            <Select
              value={driverId}
              onValueChange={(v) => setDriverId(v ?? "")}
            >
              <SelectTrigger className="h-9 w-64">
                <SelectValue placeholder={t("driver.chooseadriver")}>
                  {(value) =>
                    findById(drivers, String(value))?.name ??
                    t("driver.chooseadriver")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {driverOptions.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Card>

        {!driverId ? (
          <EmptyState message={t("driver.selectdriverprompt")} />
        ) : (
          <ListLayout
            filters={
              <FilterRail
                activeCount={activeFilterCount}
                onReset={resetFilters}
              >
                <FilterSection title={t("common.status")}>
                  <CheckboxGroupFilter
                    options={DriversConfig.LEAVE_STATUS_OPTIONS}
                    selected={statuses}
                    onChange={handleStatusChange}
                  />
                </FilterSection>
                <FilterSection title={t("driver.daterange")}>
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          dateFilterMode === "all" &&
                            "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                        )}
                        onClick={() => handleDateFilterModeChange("all")}
                      >
                        {t("driver.alltime")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          dateFilterMode === "range" &&
                            "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                        )}
                        onClick={() => handleDateFilterModeChange("range")}
                      >
                        {t("driver.customrange")}
                      </Button>
                    </div>
                    {dateFilterMode === "range" ? (
                      <div className="flex flex-col gap-1.5">
                        <Input
                          type="date"
                          value={filterRangeStart}
                          onChange={(e) =>
                            handleFilterRangeStartChange(e.target.value)
                          }
                          className="h-8"
                          aria-label={t("driver.startdate")}
                        />
                        <Input
                          type="date"
                          value={filterRangeEnd}
                          onChange={(e) =>
                            handleFilterRangeEndChange(e.target.value)
                          }
                          className="h-8"
                          aria-label={t("driver.enddate")}
                        />
                        {dateRangeInvalid ? (
                          <span className="text-xs text-destructive">
                            {t("driver.invaliddaterange")}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </FilterSection>
              </FilterRail>
            }
          >
            <div className="flex flex-col gap-6">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />{" "}
                  {t("common.loading")}
                </div>
              ) : null}

              {!loading && filteredData.length === 0 ? (
                <EmptyState message={t("driver.noptorecords")} />
              ) : !loading ? (
                <Card className="overflow-hidden py-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableHeaderRow([
                            t("driver.daterange"),
                            t("driver.reason"),
                            t("common.status"),
                            t("driver.requestedon"),
                            t("driver.reviewedon"),
                            t("driver.reviewnotes"),
                            "",
                          ])}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((pto) => {
                          const meta =
                            DriversConfig.leaveStatusMeta[pto.status];
                          const isActing = actioningId === pto.id;
                          const status = pto.status;
                          return (
                            <TableRow
                              key={pto.id}
                              ref={
                                inboundPtoId === pto.id ? selectedRowRef : null
                              }
                              className={cn(
                                "cursor-pointer transition-all",
                                inboundPtoId === pto.id
                                  ? "ring-2 ring-ring/50 ring-inset animate-pulse"
                                  : "",
                              )}
                            >
                              <TableCell className="text-xs text-muted-foreground">
                                {formatMonthDayYear(pto.startDate)} –{" "}
                                {formatMonthDayYear(pto.endDate)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {pto.reason || "—"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={t(meta.label)}
                                  cls={meta.cls}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatMonthDayYear(pto.createdAt)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {pto.reviewedAt
                                  ? formatMonthDayYear(pto.reviewedAt)
                                  : t("driver.notreviewed")}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {pto.reviewNotes || "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1.5">
                                  {(status === "PENDING" || status === "REJECTED") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isActing}
                                      onClick={() => openConfirm(pto, "approve")}
                                    >
                                      {isActing && (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      )}
                                      {t("driver.approve")}
                                    </Button>
                                  )}

                                  {(status === "PENDING" || status === "APPROVED") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive"
                                      disabled={isActing}
                                      onClick={() =>
                                        openConfirm(
                                          pto,
                                          status === "PENDING"
                                            ? "reject"
                                            : "cancel",
                                        )
                                      }
                                    >
                                      {isActing && (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      )}
                                      {status === "PENDING"
                                        ? t("driver.reject")
                                        : t("driver.cancelleave")}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : null}

              {total > 0 ? (
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  total={total}
                  itemLabel={t("driver.ptotitle").toLowerCase()}
                />
              ) : null}
            </div>
          </ListLayout>
        )}
      </div>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.mode === "approve"
                ? t("driver.approveptotitle")
                : confirmTarget?.mode === "reject"
                  ? t("driver.rejectptotitle")
                  : t("driver.cancelptotitle")}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.mode === "approve"
                ? t("driver.approveptodesc")
                : confirmTarget?.mode === "reject"
                  ? t("driver.rejectptodesc")
                  : t("driver.cancelptodesc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={t("driver.reviewnotesplaceholder")}
            aria-label={t("driver.reviewnotes")}
          />
          <DialogFooter showCloseButton>
            <Button
              variant={confirmTarget?.mode === "approve" ? "default" : "destructive"}
              disabled={actioningId !== null}
              onClick={submitConfirm}
            >
              {actioningId !== null && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {confirmTarget?.mode === "approve"
                ? t("driver.approve")
                : confirmTarget?.mode === "reject"
                  ? t("driver.reject")
                  : t("driver.cancelleave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

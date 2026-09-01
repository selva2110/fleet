"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Repeat,
  UtensilsCrossed,
  Users,
  Package,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowActions } from "@/components/crud/row-actions";
import { EventDetail } from "@/components/events/event-detail";
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  Pagination,
  compareValues,
  useDataView,
  usePagination,
} from "@/components/data-view/data-view";
import { useCenters, useEvents, useEventMutations } from "@/lib/events/hooks";
import { useTrips } from "@/lib/trips/hooks";
import { formatMonthDayYear, formatTimeOfDay } from "@/lib/date";
import { tableHeaderRow } from "@/components/aurora/aurora-ui";
import { EventsConfig } from "@/lib/events/config";
import { EventsTab, FleetEvent } from "@/lib/events/types";
import { TripsUtils } from "@/lib/trips/utils";
import { useTranslation } from "@/components/context/language-provider";
import { findById } from "@/lib/utils";

export default function EventsPage() {
  const { centers } = useCenters();
  const { events } = useEvents();
  const { deleteEvent } = useEventMutations();
  const { trips } = useTrips();
  const { t } = useTranslation();
  const router = useRouter();
  const dv = useDataView("date");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [centerIds, setCenterIds] = useState<string[]>([]);

  const CENTER_OPTIONS = centers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const activeFilterCount =
    (types.length ? 1 : 0) +
    (statuses.length ? 1 : 0) +
    (centerIds.length ? 1 : 0);

  function resetFilters() {
    setTypes([]);
    setStatuses([]);
    setCenterIds([]);
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase();
    const list = events.filter((e) => {
      const center = findById(centers, e.centerId);
      const matchQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (center?.name.toLowerCase().includes(q) ?? false);
      const matchType = types.length === 0 || types.includes(e.type);
      const matchStatus = statuses.length === 0 || statuses.includes(e.status);
      const matchCenter =
        centerIds.length === 0 || centerIds.includes(e.centerId);
      return matchQuery && matchType && matchStatus && matchCenter;
    });
    return list.sort((a, b) =>
      compareValues(
        a[dv.sortKey as keyof FleetEvent],
        b[dv.sortKey as keyof FleetEvent],
        dv.sortDir,
      ),
    );
  }, [
    events,
    centers,
    dv.query,
    dv.sortKey,
    dv.sortDir,
    types,
    statuses,
    centerIds,
  ]);

  const pg = usePagination(filtered, 20);

  function assignedInfo(e: FleetEvent) {
    const participantIds = Array.isArray(e.participantIds)
      ? e.participantIds
      : [];
    const assignedCount = trips
      .filter((t) => t.eventId === e.id && t.status !== "CANCELLED")
      .reduce((count, t) => {
        const stops = Array.isArray(t.stops) ? t.stops.length : 0;
        return count + (t.tripCreationFailedReason ? 0 : stops);
      }, 0);
    return { assignedCount: assignedCount, total: participantIds.length };
  }

  function isDispatched(e: FleetEvent) {
    return TripsUtils.getPlanStatus(e, trips).dispatched;
  }

  function openAdd() {
    router.push("/events/new");
  }
  function openEdit(e: FleetEvent) {
    router.push(`/events/new?id=${e.id}`);
  }

  function toggleDetail(e: FleetEvent) {
    setDetailId((prev) => (prev === e.id ? null : e.id));
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER['events']?.title)}
        description={t(EventsConfig.EVENT_HEADER['events']?.description)}
        actions={
          <Button onClick={openAdd} size="lg">
            <Plus className="size-4" /> {t("e.addevent")}
          </Button>
        }
      />

      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t("e.eventType")}>
                <CheckboxGroupFilter
                  options={EventsConfig.TYPE_OPTIONS}
                  selected={types}
                  onChange={setTypes}
                />
              </FilterSection>
              <FilterSection title={t("common.status")}>
                <CheckboxGroupFilter
                  options={EventsConfig.STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
              <FilterSection title={t("common.center")}>
                <CheckboxGroupFilter
                  options={CENTER_OPTIONS}
                  selected={centerIds}
                  onChange={setCenterIds}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t("e.searchplaceholder")}
              sortOptions={EventsConfig.SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <EmptyState message={t("e.none")} />
            ) : dv.view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pg.pageItems.map((e) => {
                  const center = findById(centers, e.centerId);
                  const meta =
                    EventsConfig.eventStatusMeta[e.status] ??
                    EventsConfig.eventStatusMeta["draft"];
                  const { assignedCount, total } = assignedInfo(e);
                  return (
                    <Fragment key={e.id}>
                      <Card
                        onClick={() => toggleDetail(e)}
                        data-active={detailId === e.id}
                        className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40 data-[active=true]:border-primary/50"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-pretty">
                              {e.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t(EventsConfig.TYPE_OPTION_LABELS[e.type])}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <StatusBadge label={t(meta.label)} cls={meta.cls} />
                            <RowActions
                              onEdit={() => openEdit(e)}
                              onDelete={() => deleteEvent(e.id, e.name)}
                              deleteTitle={t("e.deleteev")}
                              deleteMessage={t("e.deleteevconfrm").replace(
                                "{{name}}",
                                e.name,
                              )}
                              canDelete={!isDispatched(e)}
                              deleteDisabledReason={t("e.dispatchedNoddel")}
                            />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2 px-4 py-3 text-xs text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0" />{" "}
                            {center?.name}
                          </p>
                          <p className="flex items-center gap-2">
                            <CalendarDays className="size-3.5 shrink-0" />{" "}
                            {formatMonthDayYear(e.date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="size-3.5 shrink-0" />{" "}
                            {formatTimeOfDay(e.startTime)} – {formatTimeOfDay(e.endTime)}
                            {e.roundTrip ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                <Repeat className="size-3" /> {t("e.roundTrip")}
                              </span>
                            ) : null}
                          </p>
                          <p className="flex items-center gap-2">
                            <Users className="size-3.5 shrink-0" /> {total}{" "}
                            {t("common.participants")}
                          </p>
                        </div>
                        <div
                          className="border-t border-border px-4 py-3"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="font-medium text-foreground">
                              {t("e.transportassigned")}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {assignedCount}/{total}
                            </span>
                          </div>
                          <Progress
                            value={total ? (assignedCount / total) * 100 : 0}
                            className="h-1.5"
                          />
                        </div>
                      </Card>
                      {detailId === e.id ? (
                        <div className="md:col-span-2 xl:col-span-3">
                          <EventDetail
                            inline
                            open
                            onOpenChange={(v) => !v && setDetailId(null)}
                            event={e}
                          />
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t("e.event"),
                          t("common.center"),
                          t("common.date"),
                          t("common.time"),
                          t("common.transport"),
                          t("common.status"),
                        ])}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.pageItems.map((e) => {
                        const center = findById(centers, e.centerId);
                        const meta =
                          EventsConfig.eventStatusMeta[e.status] ??
                          EventsConfig.eventStatusMeta["draft"];
                        const { assignedCount, total } = assignedInfo(e);
                        return (
                          <Fragment key={e.id}>
                            <TableRow
                              onClick={() => toggleDetail(e)}
                              data-active={detailId === e.id}
                              className="cursor-pointer data-[active=true]:bg-muted/60"
                            >
                              <TableCell>
                                <p className="font-medium text-center">
                                  {e.idx}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium">{e.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {e.type}
                                </p>
                              </TableCell>
                              <TableCell className="text-sm">
                                {center?.name}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {formatMonthDayYear(e.date)}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  {formatTimeOfDay(e.startTime)}–{formatTimeOfDay(e.endTime)}
                                  {e.roundTrip ? (
                                    <Repeat
                                      className="size-3.5 text-primary"
                                      aria-label={t("e.roundTrip")}
                                    />
                                  ) : null}
                                </span>
                              </TableCell>
                              <TableCell className="w-40">
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={
                                      total ? (assignedCount / total) * 100 : 0
                                    }
                                    className="h-1.5 flex-1"
                                  />
                                  <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {assignedCount}/{total}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={t(meta.label)}
                                  cls={meta.cls}
                                />
                              </TableCell>
                              <TableCell onClick={(ev) => ev.stopPropagation()}>
                                <RowActions
                                  onEdit={() => openEdit(e)}
                                  onDelete={() =>
                                    deleteEvent(e.id, e.name)
                                  }
                                  deleteTitle={t("e.deleteev")}
                                  deleteMessage={t("e.deleteevconfrm").replace(
                                    "{{name}}",
                                    e.name,
                                  )}
                                  canDelete={!isDispatched(e)}
                                  deleteDisabledReason={t("e.dispatchedNoddel")}
                                />
                              </TableCell>
                            </TableRow>
                            {detailId === e.id ? (
                              <TableRow className="hover:bg-transparent">
                                <TableCell
                                  colSpan={7}
                                  className="bg-muted/20 p-3"
                                >
                                  <EventDetail
                                    inline
                                    open
                                    onOpenChange={(v) =>
                                      !v && setDetailId(null)
                                    }
                                    event={e}
                                  />
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {filtered.length > 0 ? (
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                pageSize={pg.pageSize}
                onPageChange={pg.setPage}
                onPageSizeChange={pg.setPageSize}
                rangeStart={pg.rangeStart}
                rangeEnd={pg.rangeEnd}
                total={pg.total}
                itemLabel={t("e.events")}
              />
            ) : null}
          </div>
        </ListLayout>
      </div>
    </div>
  );
}

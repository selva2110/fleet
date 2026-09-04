"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CalendarProps as RbcCalendarProps } from "react-big-calendar";
import { dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Truck,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { GlassCard, PanelTitle } from "./aurora-ui";
import { useEvents } from "@/lib/events/hooks";
import { useMealDeliveries } from "@/lib/meals/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useTrips } from "@/lib/trips/hooks";
import { useCenters } from "@/lib/events/hooks";
import { formatShiftDays } from "@/lib/labels";
import { formatTimeOfDay } from "@/lib/date";
import { cn, findById } from "@/lib/utils";
import { EventsConfig } from "@/lib/events/config";
import { DriversConfig } from "@/lib/driver/config";
import { FleetEvent } from "@/lib/events/types";
import { Driver } from "@/lib/driver/types";
import {
  CalendarRecord,
  CalendarResource,
  LayerKey,
  SelectedItem,
} from "@/lib/aurora/types";
import { AuroraConfig } from "@/lib/aurora/config";
import { useTranslation } from "../context/language-provider";
import { MealRun } from "@/lib/meals/types";
import { MealsConfig } from "@/lib/meals/config";

/*
 * react-big-calendar's dayjs localizer computes week boundaries from
 * dayjs's *global* locale settings, not from a per-instance culture
 * prop — so the app-wide "en" locale is adjusted once, here, to start
 * weeks on Monday. Nothing else in the app relies on dayjs week math
 * (grep confirms it), so this is safe to set globally.
 */
dayjs.extend(updateLocale);
dayjs.updateLocale("en", { weekStart: 1 });

const rbcLocalizer = dayjsLocalizer(dayjs);

/*
 * The calendar reads "today" and the current time on first render,
 * which can differ between the server render and the client hydration
 * pass (and it has no reason to render before the browser paints
 * anyway), so it's skipped on the server entirely.
 */
const RbcCalendar = dynamic(
  () => import("react-big-calendar").then((mod) => mod.Calendar),
  { ssr: false },
) as unknown as ComponentType<
  RbcCalendarProps<CalendarRecord, CalendarResource>
>;

/* ==========================================================================
 * MAIN CALENDAR
 * ========================================================================== */

export function AuroraCalendars() {
  const { events } = useEvents();
  const { mealDeliveries } = useMealDeliveries();
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();
  const { trips } = useTrips();
  const { t } = useTranslation();
  const [layer, setLayer] = useState<LayerKey>("event");
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [selectedMoreEvents, setSelectedMoreEvents] = useState<
    CalendarRecord[] | null
  >(null);
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">(
    "week",
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const isCurrentPeriodToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    if (currentView === "day") {
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }

    if (currentView === "week") {
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return today >= weekStart && today <= weekEnd;
    }

    if (currentView === "month") {
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth()
      );
    }

    return false;
  }, [currentDate, currentView]);

  /* ==========================================================================
   * NAVIGATION
   * ========================================================================== */

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const goPrevious = () => {
    setCurrentDate((previousDate) => {
      const date = new Date(previousDate);

      if (currentView === "day") {
        date.setDate(date.getDate() - 1);
      }

      if (currentView === "week") {
        date.setDate(date.getDate() - 7);
      }

      if (currentView === "month") {
        date.setMonth(date.getMonth() - 1);
      }

      return date;
    });
  };

  const goNext = () => {
    setCurrentDate((previousDate) => {
      const date = new Date(previousDate);

      if (currentView === "day") {
        date.setDate(date.getDate() + 1);
      }

      if (currentView === "week") {
        date.setDate(date.getDate() + 7);
      }

      if (currentView === "month") {
        date.setMonth(date.getMonth() + 1);
      }

      return date;
    });
  };

  /* ==========================================================================
   * EVENT DATA
   * ========================================================================== */

  const eventCalendarData = useMemo<CalendarRecord[]>(() => {
    return events.map((event) => {
      const start = combineDateAndTime(event.date, event.startTime);
      let end: Date;
      if (event.endTime) {
        end = combineDateAndTime(event.date, event.endTime);
        if (end <= start) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }
      } else {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      return {
        id: `event-${event.id}`,
        title: event.name,
        start,
        end,
        allDay: false,
        backgroundColor: "#22d3ee",
        Kind: "event",
        Data: event,
      };
    });
  }, [events]);

  /* ==========================================================================
   * MEAL DATA
   * ========================================================================== */

  const mealCalendarData = useMemo<CalendarRecord[]>(() => {
    return mealDeliveries
      .filter((meal) => meal.status === "ACTIVE")
      .map((meal) => {
        const start = combineDateAndTime(meal.fromDate, meal.departTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          id: `meal-${meal.id}`,
          title: meal.name,
          start,
          end,
          allDay: false,
          backgroundColor: "#fbbf24",
          Kind: "meal",
          Data: meal,
        };
      });
  }, [mealDeliveries]);

  /* ==========================================================================
   * DRIVER DATA
   * ========================================================================== */

  const driverCalendarData = useMemo<CalendarRecord[]>(() => {
    const result: CalendarRecord[] = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      for (const driver of drivers) {
        if (!driver.shiftDays?.includes(dayOfWeek)) {
          continue;
        }
        const dateKey = formatDateKey(date);
        const start = combineDateAndTime(dateKey, driver.shiftStart);
        let end = combineDateAndTime(dateKey, driver.shiftEnd);
        if (end <= start) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }

        result.push({
          id: `driver-${driver.id}-${dateKey}`,
          title: driver.name,
          start,
          end,
          allDay: false,
          backgroundColor: "#4ade80",
          Kind: "driver",
          Data: driver,
          resourceId: driver.id,
        });
      }
    }

    return result;
  }, [drivers]);

  /* ==========================================================================
   * VEHICLE DATA
   * ========================================================================== */

  const vehicleCalendarData = useMemo<CalendarRecord[]>(() => {
    const result: CalendarRecord[] = [];

    /*
     * Event vehicles
     */
    for (const event of events) {
      const eventTrips = trips.filter(
        (trip) =>
          trip.eventId === event.id &&
          trip.status !== "CANCELLED" &&
          Boolean(trip.vehicleId),
      );

      const seenVehicles = new Set<string>();

      for (const trip of eventTrips) {
        if (!trip.vehicleId) {
          continue;
        }

        if (seenVehicles.has(trip.vehicleId)) {
          continue;
        }

        seenVehicles.add(trip.vehicleId);
        const vehicle = findById(vehicles, trip.vehicleId);
        const start = combineDateAndTime(event.date, event.startTime);
        let end: Date;
        if (event.endTime) {
          end = combineDateAndTime(event.date, event.endTime);
          if (end <= start) {
            end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          }
        } else {
          end = new Date(start.getTime() + 60 * 60 * 1000);
        }

        result.push({
          id: `vehicle-event-${event.id}-${trip.vehicleId}`,
          title: vehicle?.name ?? t("common.vehicle"),
          start,
          end,
          allDay: false,
          backgroundColor: "#a78bfa",
          Kind: "vehicle",
          Data: event,
          resourceId: trip.vehicleId,
        });
      }
    }

    /*
     * Meal vehicles
     */
    for (const meal of mealDeliveries) {
      if (meal.status !== "ACTIVE" || !meal.vehicleId) {
        continue;
      }

      const vehicle = findById(vehicles, meal.vehicleId);
      const start = combineDateAndTime(meal.fromDate, meal.departTime);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      result.push({
        id: `vehicle-meal-${meal.id}`,
        title: vehicle?.name ?? t("common.vehicle"),
        start,
        end,
        allDay: false,
        backgroundColor: "#a78bfa",
        Kind: "vehicle",
        Data: meal,
        resourceId: meal.vehicleId,
      });
    }

    return result;
  }, [events, trips, mealDeliveries, vehicles, t]);

  /* ==========================================================================
   * ACTIVE DATA
   * ========================================================================== */

  const calendarData = useMemo<CalendarRecord[]>(() => {
    switch (layer) {
      case "event":
        return eventCalendarData;
      case "meal":
        return mealCalendarData;
      case "driver":
        return driverCalendarData;
      case "vehicle":
        return vehicleCalendarData;
      default:
        return [];
    }
  }, [
    layer,
    eventCalendarData,
    mealCalendarData,
    driverCalendarData,
    vehicleCalendarData,
  ]);

  /* ==========================================================================
   * RESOURCE ROWS
   *
   * The "driver" and "vehicle" layers render as a Teams-Shifts-style
   * schedule: one row per resource, days across the top (Day/Week views
   * only — react-big-calendar's Month view has no resource axis).
   * react-big-calendar reads each event's `resourceId` field and each
   * resource's `id`/`title` by default, so no custom accessors needed.
   * ========================================================================== */

  const calendarResources = useMemo<CalendarResource[] | undefined>(() => {
    if (layer === "driver") {
      return drivers.map((driver) => ({
        id: driver.id,
        title: driver.name,
      }));
    }

    if (layer === "vehicle") {
      return vehicles.map((vehicle) => ({
        id: vehicle.id,
        title: vehicle.name,
      }));
    }

    return undefined;
  }, [layer, drivers, vehicles]);

  /* ==========================================================================
   * EVENT CLICK
   *
   * react-big-calendar hands back the CalendarRecord itself (its
   * accessors already point at `title`/`start`/`end`/`resourceId`), so
   * there's no wrapper payload to unwrap here.
   * ========================================================================== */

  const handleEventClick = (event: CalendarRecord) => {
    if (event.Kind === "event") {
      setSelected({ kind: "event", data: event.Data as FleetEvent });
      return;
    }

    if (event.Kind === "meal") {
      setSelected({ kind: "meal", data: event.Data as MealRun });
      return;
    }

    if (event.Kind === "driver") {
      setSelected({ kind: "driver", data: event.Data as Driver });
      return;
    }

    if (event.Kind === "vehicle") {
      if (isFleetEvent(event.Data)) {
        setSelected({ kind: "event", data: event.Data });
      } else if (isMealDelivery(event.Data)) {
        setSelected({ kind: "meal", data: event.Data });
      }
    }
  };

  /* ==========================================================================
   * SHOW MORE
   *
   * Fired when the "+N more" link in Month view is clicked. We render
   * our own dialog instead of react-big-calendar's default popup so it
   * matches the rest of the app.
   * ========================================================================== */

  const handleShowMore = (events: CalendarRecord[]) => {
    setSelectedMoreEvents(events);
  };

  const changeView = (view: "day" | "week" | "month") => {
    setCurrentView(view);
  };
  const active = AuroraConfig.LAYERS[layer];

  const scrollToTime = useMemo(() => {
    const date = new Date();
    date.setHours(6, 0, 0, 0);
    return date;
  }, []);

  /* ==========================================================================
   * DATE LABEL
   * ========================================================================== */

  const dateLabel = useMemo(() => {
    const date = new Date(currentDate);

    if (currentView === "day") {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (currentView === "week") {
      const start = new Date(date);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const startText = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endText = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
      });
      return `${startText} – ${endText}`;
    }
    if (currentView === "month") {
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }

    return "";
  }, [currentDate, currentView]);

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle
        icon={CalendarDays}
        accent="cyan"
        className="px-5 pt-4"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goPrevious}
              className="rounded-lg border border-border bg-card/90 p-1.5 text-foreground transition-colors hover:bg-card"
              aria-label={`Previous ${currentView}`}
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="min-w-40 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-center text-xs font-medium text-foreground">
              {dateLabel}
            </span>

            <button
              type="button"
              onClick={goNext}
              className="rounded-lg border border-border bg-card/90 p-1.5 text-foreground transition-colors hover:bg-card"
              aria-label={`Next ${currentView}`}
            >
              <ChevronRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={goToday}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",

                isCurrentPeriodToday
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card/80 text-foreground hover:bg-card",
              )}
            >
              {t("aurora.today")}
            </button>

            <Select
              value={currentView}
              onValueChange={(value) => {
                if (value === "day" || value === "week" || value === "month") {
                  changeView(value);
                }
              }}
            >
              <SelectTrigger className="w-28 border-border bg-card/80 text-foreground">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {t("aurora.schedule")}

        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {calendarData.length} {t(active.label)}
        </span>
      </PanelTitle>

      {/* ======================================================================
       * LAYER SELECTOR
       * ====================================================================== */}

      <div className="mt-3 px-4">
        <div className="w-full sm:max-w-56">
          <Select
            value={layer}
            onValueChange={(value) => {
              if (value) {
                setLayer(value as LayerKey);
              }
            }}
          >
            <SelectTrigger className="w-full border-border bg-card/80 text-foreground">
              <span className="flex min-w-0 items-center gap-2">
                <active.icon className="size-3.5 shrink-0 text-muted-foreground" />

                <SelectValue>
                  {(value) =>
                    t(
                      AuroraConfig.LAYER_OPTIONS.find(
                        (option) => option.value === value,
                      )?.label ?? "",
                    )
                  }
                </SelectValue>
              </span>
            </SelectTrigger>

            <SelectContent>
              {AuroraConfig.LAYER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ======================================================================
       * CALENDAR
       * ====================================================================== */}

      <div className="mt-4 px-4">
        <div className="aurora-rbc-calendar h-125 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-background">
          <RbcCalendar
            key={layer}
            localizer={rbcLocalizer}
            events={calendarData}
            resources={calendarResources}
            views={["month", "week", "day"]}
            view={currentView}
            date={currentDate}
            step={60}
            timeslots={1}
            scrollToTime={scrollToTime}
            popup={false}
            selectable={false}
            dayLayoutAlgorithm="no-overlap"
            getDrilldownView={() => null}
            style={{ height: "100%" }}
            eventPropGetter={() => ({
              style: {
                backgroundColor:
                  "color-mix(in oklch, var(--primary) 25%, transparent)",
                borderLeft: "4px solid var(--primary)",
                color: "var(--primary)",
              },
            })}
            formats={{ timeGutterFormat: "h A" }}
            components={{
              toolbar: () => null,
              event: ({ event }) => (
                <span className="block min-w-0 truncate text-[10px] font-semibold leading-tight">
                  {event.title}
                </span>
              ),
            }}
            onSelectEvent={handleEventClick}
            onShowMore={handleShowMore}
            onNavigate={(date) => setCurrentDate(date)}
            onView={(view) => {
              if (view === "day" || view === "week" || view === "month") {
                setCurrentView(view);
              }
            }}
          />
        </div>
      </div>

      {/* ======================================================================
       * DETAILS DIALOG
       * ====================================================================== */}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {selected?.kind === "event" ? (
            <EventDetail event={selected.data as FleetEvent} />
          ) : null}

          {selected?.kind === "meal" ? (
            <MealDetail meal={selected.data as MealRun} />
          ) : null}

          {selected?.kind === "driver" ? (
            <DriverDetail driver={selected.data as Driver} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ======================================================================
       * MORE EVENTS DIALOG
       * ====================================================================== */}

      <Dialog
        open={selectedMoreEvents !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMoreEvents(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>More scheduled items</DialogTitle>

            <DialogDescription>
              {selectedMoreEvents?.length ?? 0} additional items overlap this
              time.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-100 space-y-2 overflow-y-auto">
            {selectedMoreEvents?.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedMoreEvents(null);

                  handleEventClick(event);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2 text-left hover:bg-card"
              >
                <span className="min-w-0 truncate text-xs font-medium">
                  {event.title}
                </span>

                <span className="ml-3 shrink-0 text-[10px] text-muted-foreground">
                  {formatDateTimeRange(event.start, event.end)}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

/* ==========================================================================
 * EVENT TYPE HELPERS
 * ========================================================================== */

function isFleetEvent(
  value: FleetEvent | MealRun | Driver,
): value is FleetEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "participantIds" in value &&
    "centerId" in value &&
    "startTime" in value
  );
}

function isMealDelivery(
  value: FleetEvent | MealRun | Driver,
): value is MealRun {
  return (
    typeof value === "object" &&
    value !== null &&
    "participants" in value &&
    "departTime" in value &&
    "fromDate" in value
  );
}

/* ==========================================================================
 * EVENT DETAIL
 * ========================================================================== */

function EventDetail({ event }: { event: FleetEvent }) {
  const { centers } = useCenters();
  const { trips } = useTrips();
  const { vehicles: allVehicles } = useVehicles();
  const { drivers: allDrivers } = useDrivers();

  const { t } = useTranslation();

  const center = findById(centers, event.centerId);

  const eventTrips = trips.filter(
    (trip) => trip.eventId === event.id && trip.status !== "CANCELLED",
  );

  const vehicles = [
    ...new Set(
      eventTrips
        .map((trip) => trip.vehicleId)
        .filter((id): id is string => Boolean(id)),
    ),
  ].map((id) => findById(allVehicles, id));

  const drivers = [
    ...new Set(
      eventTrips
        .map((trip) => trip.driverId)
        .filter((id): id is string => Boolean(id)),
    ),
  ].map((id) => findById(allDrivers, id));

  const participantCount = Array.isArray(event.participantIds)
    ? event.participantIds.length
    : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />

          {event.name}
        </DialogTitle>

        <DialogDescription>
          {EventsConfig.TYPE_OPTION_LABELS[event.type]
            ? t(EventsConfig.TYPE_OPTION_LABELS[event.type])
            : ""}

          {" · "}

          {t("aurora.scheduledprogramdetail")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />

            {formatTimeOfDay(event.startTime)}

            {event.endTime ? ` – ${formatTimeOfDay(event.endTime)}` : ""}
          </span>

          {center ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />

              {center.name}
            </span>
          ) : null}

          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {participantCount || event.expectedAttendance}{" "}
            {t("planner.ridersword")}
          </span>
        </DetailRow>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("aurora.assignedtransport")}
          </p>

          {vehicles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-[12px] text-muted-foreground">
              {t("aurora.novehiclesassigned")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {vehicles.map((vehicle, index) => (
                <li
                  key={vehicle?.id ?? index}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Truck className="size-3.5" />

                    {vehicle?.name ?? t("common.vehicle")}
                  </span>

                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <UserRound className="size-3.5" />

                    {drivers[index]?.name ?? t("common.unassigned")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* ==========================================================================
 * MEAL DETAIL
 * ========================================================================== */

function MealDetail({ meal }: { meal: MealRun }) {
  const { centers } = useCenters();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const { t } = useTranslation();

  const center = findById(centers, meal.centerId);

  const vehicle = meal.vehicleId
    ? findById(vehicles, meal.vehicleId)
    : undefined;

  const driver = meal.driverId ? findById(drivers, meal.driverId) : undefined;

  const meta = MealsConfig.mealStatusMeta[meal.status];

  const driverMeta = driver
    ? DriversConfig.getDriverStatusMeta(driver.status)
    : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UtensilsCrossed className="size-4 text-primary" />
          {meal.name}
        </DialogTitle>

        <DialogDescription>{t("aurora.mealrunscheduledesc")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {t("meal.departs")} {formatTimeOfDay(meal.departTime)}
          </span>

          {center ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />

              {center.name}
            </span>
          ) : null}

          {meta ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                meta.cls,
              )}
            >
              {t(meta.label)}
            </span>
          ) : null}
        </DetailRow>

        <DetailRow>
          <span>
            {meal.participants.length} {t("meal.deliveries").toLowerCase()}
          </span>
        </DetailRow>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium">
            <Truck className="size-3.5" />

            {vehicle?.name ?? t("trip.novehicle")}
          </span>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="size-3.5" />

            {driver?.name ?? t("common.unassigned")}

            {driverMeta ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  driverMeta.cls,
                )}
              >
                {t(driverMeta.label)}
              </span>
            ) : null}

            {driver ? (
              <Star className="size-3 fill-warning text-warning" />
            ) : null}
          </span>
        </div>
      </div>
    </>
  );
}

/* ==========================================================================
 * DRIVER DETAIL
 * ========================================================================== */

function DriverDetail({ driver }: { driver: Driver }) {
  const { vehicles } = useVehicles();

  const { t } = useTranslation();

  const vehicle = driver.assignedVehicleId
    ? findById(vehicles, driver.assignedVehicleId)
    : undefined;

  const meta = DriversConfig.getDriverStatusMeta(driver.status);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" />

          {driver.name}
        </DialogTitle>

        <DialogDescription>{t("aurora.drivershiftdesc")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatTimeOfDay(driver.shiftStart)} – {formatTimeOfDay(driver.shiftEnd)}
          </span>

          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              meta.cls,
            )}
          >
            {t(meta.label)}
          </span>
        </DetailRow>

        <DetailRow>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />

            {t(formatShiftDays(driver.shiftDays))}
          </span>
        </DetailRow>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium">
            <Truck className="size-3.5" />

            {vehicle?.name ?? t("aurora.novehicleassigned")}
          </span>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="size-3 fill-warning text-warning" />

            {driver.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </>
  );
}

/* ==========================================================================
 * DETAIL ROW
 * ========================================================================== */

function DetailRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
      {children}
    </div>
  );
}

/* ==========================================================================
 * DATE HELPERS
 * ========================================================================== */

function combineDateAndTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);

  const [hour, minute] = time.split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ==========================================================================
 * DATE/TIME LABEL
 * ========================================================================== */

function formatDateTimeRange(start: Date, end: Date): string {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

import { SortOption } from "@/components/data-view/data-view";
import { EventsTab, EventStatus, FleetEvent } from "./types";

export class EventsConfig {
  static readonly TYPE_OPTIONS = [
    { value: "Dialysis Session", label: "e.dialysis_session" },
    { value: "Clinical Appointment", label: "e.clinical_appointment" },
    { value: "Vaccination Camp", label: "e.vaccination_camp" },
    { value: "Community Program", label: "e.community_program" },
    { value: "Therapy Session", label: "e.therapy_session" },
    { value: "Rehabilitation Session", label: "e.rehabilitation_session" },
    { value: "Health Screening", label: "e.health_screening" },
  ];

  static readonly TYPE_OPTION_LABELS = {
    "Dialysis Session": "e.dialysis_session",
    "Clinical Appointment": "e.clinical_appointment",
    "Vaccination Camp": "e.vaccination_camp",
    "Community Program": "e.community_program",
    "Therapy Session": "e.therapy_session",
    "Rehabilitation Session": "e.rehabilitation_session",
    "Health Screening": "e.health_screening",
  };

  static readonly eventStatusMeta: Record<
    FleetEvent["status"],
    { label: string; cls: string }
  > = {
    draft: { label: "e.draft", cls: "bg-muted text-muted-foreground" },
    scheduled: {
      label: "e.scheduled",
      cls: "bg-accent text-accent-foreground",
    },
    planning: {
      label: "e.planning",
      cls: "bg-warning/20 text-warning-foreground",
    },
    active: { label: "e.active", cls: "bg-primary/15 text-primary" },
    completed: { label: "e.completed", cls: "bg-success/20 text-success" },
    registered: { label: "e.registered", cls: "bg-primary/15 text-primary" },
    offline: { label: "e.offline", cls: "bg-muted text-muted-foreground" },
    available: { label: "e.available", cls: "bg-success/20 text-success" },
  };

  static readonly STATUS_OPTIONS = Object.entries(this.eventStatusMeta).map(
    ([value, m]) => ({
      value,
      label: m.label,
    }),
  );

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "date", label: "common.date" },
    { key: "name", label: "common.name" },
    { key: "type", label: "common.type" },
    { key: "status", label: "common.status" },
    { key: "expectedAttendance", label: "common.attendance" },
  ];

  static readonly REMINDER_FREQ: { value: string; label: string }[] = [
    { value: "1440", label: "e.reminder24hoursbefore" },
    { value: "720", label: "e.reminder12hoursbefore" },
    { value: "120", label: "e.reminder2hoursbefore" },
    { value: "60", label: "e.reminder1hourbefore" },
    { value: "0", label: "e.noautomaticreminder" },
  ];

  // Human-friendly metadata used by the event feed / debug log UI.
  static readonly EVENT_META: Record<
    string,
    { label: string; tone: "info" | "success" | "warning" | "danger" | "muted" }
  > = {
    "event.created": { label: "e.eventcreated", tone: "info" },
    "event.updated": { label: "e.eventupdated", tone: "info" },
    "event.deleted": { label: "e.eventdeleted", tone: "danger" },
    "event.reminder.sent": { label: "e.remindersent", tone: "warning" },
    "notification.sent": { label: "e.smsnotificationssent", tone: "info" },
    "notification.delivered": { label: "e.smsdelivered", tone: "success" },
    "notification.failed": { label: "e.smsfailed", tone: "danger" },
    "notification.response": {
      label: "e.participantresponded",
      tone: "success",
    },
    "participant.created": { label: "e.participantadded", tone: "info" },
    "participant.updated": { label: "e.participantupdated", tone: "info" },
    "participant.deleted": { label: "e.participantremoved", tone: "danger" },
    "vehicle.created": { label: "e.vehicleadded", tone: "info" },
    "vehicle.updated": { label: "e.vehicleupdated", tone: "info" },
    "vehicle.deleted": { label: "e.vehicleremoved", tone: "danger" },
    "driver.created": { label: "e.driveradded", tone: "info" },
    "driver.updated": { label: "e.driverupdated", tone: "info" },
    "driver.deleted": { label: "e.driverremoved", tone: "danger" },
    "plan.generated": { label: "e.plangenerated", tone: "info" },
    "plan.committed": { label: "e.plancommitted", tone: "success" },
    "plan.blocked": { label: "e.dispatchblocked", tone: "danger" },
    "trip.created": { label: "e.tripcreated", tone: "info" },
    "trip.dispatched": { label: "e.tripdispatched", tone: "success" },
    "trip.driver_assigned": { label: "e.driverassigned", tone: "info" },
    "trip.started": { label: "e.tripstarted", tone: "success" },
    "trip.start_blocked": { label: "e.tripstartblocked", tone: "danger" },
    "trip.pickup_reached": { label: "e.pickupreached", tone: "info" },
    "trip.participant_picked_up": {
      label: "e.participantpickedup",
      tone: "success",
    },
    "trip.onboard": { label: "e.allaboard", tone: "success" },
    "trip.arrived": { label: "e.arrivedatcenter", tone: "success" },
    "trip.completed": { label: "e.tripcompleted", tone: "success" },
    "trip.eta_refreshed": { label: "Trip Refreshed", tone: "success" },
    "trip.cancelled": { label: "e.tripcancelled", tone: "danger" },
    "trips.cleared_all": { label: "e.alltripscleared", tone: "warning" },
    "trip.location_updated": { label: "e.triplocationupdated", tone: "muted" },
    "vehicle.location_updated": { label: "e.vehiclemoved", tone: "muted" },
    "simulation.started": { label: "e.livetrackingstarted", tone: "success" },
    "simulation.stopped": { label: "e.livetrackingpaused", tone: "warning" },
    "system.seeded": { label: "e.databaseseeded", tone: "info" },
    "system.reset": { label: "e.systemreset", tone: "warning" },
  };

  static readonly statusAccent: Record<
    EventStatus,
    { bar: string; chip: string; dot: string }
  > = {
    draft: {
      bar: "border-l-muted-foreground/40",
      chip: "bg-muted/50 hover:bg-muted/70",
      dot: "bg-muted-foreground",
    },
    planning: {
      bar: "border-l-warning",
      chip: "bg-warning/5 hover:bg-warning/10",
      dot: "bg-warning",
    },
    scheduled: {
      bar: "border-l-accent-foreground",
      chip: "bg-accent/40 hover:bg-accent/60",
      dot: "bg-accent-foreground",
    },
    active: {
      bar: "border-l-primary",
      chip: "bg-primary/5 hover:bg-primary/10",
      dot: "bg-primary",
    },
    completed: {
      bar: "border-l-success",
      chip: "bg-success/5 hover:bg-success/10",
      dot: "bg-success",
    },
    registered: {
      bar: "border-l-success",
      chip: "bg-success/5 hover:bg-success/10",
      dot: "bg-success",
    },

    available: {
      bar: "border-l-primary",
      chip: "bg-primary/5 hover:bg-primary/10",
      dot: "bg-primary",
    },

    offline: {
      bar: "border-l-muted-foreground",
      chip: "bg-muted/50 hover:bg-muted/70",
      dot: "bg-muted-foreground",
    },
  };

  static readonly WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  static readonly toneCls: Record<string, string> = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    danger: "text-destructive",
    warning: "text-warning-foreground",
  };

  // Runs that are still being planned (not yet dispatched onto the road).
  static readonly PLANNING_STATUSES = ["scheduled", "preparing", "loaded"];

  static readonly MEAL_SORT_OPTIONS: SortOption[] = [
    { key: "date", label: "common.date" },
    { key: "runNumber", label: "meal.run" },
    { key: "mealType", label: "meal.type" },
    { key: "totalMeals", label: "meal.meals" },
    { key: "status", label: "common.status" },
  ];

  static readonly TONE_DOT: Record<string, string> = {
    info: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    muted: "bg-muted-foreground/40",
  };

  static readonly TONE_TEXT: Record<string, string> = {
    info: "text-primary",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    muted: "text-muted-foreground",
  };

  static readonly EVENT_HEADER: Record<
    EventsTab,
    {
      title: string;
      description: string;
    }
  > = {
    events: {
      title: "e.events",
      description: "e.eventsdesc",
    },
    "meal-delivery": {
      title: "e.mealdel",
      description: "e.mealdeldesc",
    },
    catalog: {
      title: "e.catalogtitle",
      description: "e.catalogdesc",
    },
  };
}

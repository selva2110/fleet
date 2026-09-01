import { SmsResponseCode } from "../notification/types";

export class PartResponseConfig {
  static readonly deliveryMeta: Record<string, { label: string; cls: string }> =
    {
      queued: { label: "e.queued", cls: "bg-muted text-muted-foreground" },
      sent: { label: "common.delivered", cls: "bg-accent text-accent-foreground" },
      delivered: { label: "common.delivered", cls: "bg-success/20 text-success" },
      received: { label: "resp.replied", cls: "bg-primary/15 text-primary" },
      undelivered: {
        label: "e.undelivered",
        cls: "bg-warning/20 text-warning-foreground",
      },
      failed: { label: "e.failed", cls: "bg-destructive/15 text-destructive" },
    };
  static readonly RESPONSE_META: Record<
    SmsResponseCode,
    { label: string; short: string; cls: string; dot: string }
  > = {
    attending_transport: {
      label: "resp.attendingtransport",
      short: "resp.needstransport",
      cls: "bg-primary/15 text-primary",
      dot: "bg-primary",
    },
    attending_self: {
      label: "resp.attendingself",
      short: "e.owntransport",
      cls: "bg-success/20 text-success",
      dot: "bg-success",
    },
    not_attending: {
      label: "e.notattending",
      short: "e.notattending",
      cls: "bg-destructive/15 text-destructive",
      dot: "bg-destructive",
    },
  };
}

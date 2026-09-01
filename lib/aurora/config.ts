import {
  Bus,
  CalendarDays,
  LucideIcon,
  MessageSquare,
  Route,
  TrendingUp,
  Truck,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { AuroraAccent, LayerKey } from "./types";

export class AuroraConfig {
  static readonly LAYERS: Record<
    LayerKey,
    {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      border: string;
      bg: string;
      sub: string;
    }
  > = {
    event: {
      label: "e.events",
      icon: CalendarDays,
      border: "rgba(34,211,238,0.9)",
      bg: "rgba(34,211,238,0.16)",
      sub: "rgba(0, 229, 255, 0.9)",
    },
    driver: {
      label: "aurora.driverShfts",
      icon: UserRound,
      border: "rgba(96,165,250,0.9)",
      bg: "rgba(59,130,246,0.18)",
      sub: "rgba(0, 115, 255, 0.9)",
    },
    vehicle: {
      label: "aurora.vhbooks",
      icon: Truck,
      border: "rgba(251,191,36,0.9)",
      bg: "rgba(245,158,11,0.18)",
      sub: "rgba(255, 204, 0, 0.9)",
    },
    meal: {
      label: "aurora.mealruns",
      icon: UtensilsCrossed,
      border: "rgba(16,185,129,0.9)",
      bg: "rgba(16,185,129,0.18)",
      sub: "rgba(0, 255, 136, 0.9)",
    },
  };

  static readonly LAYER_OPTIONS: { value: LayerKey; label: string }[] = [
    { value: "event", label: "e.events" },
    { value: "driver", label: "common.drivers" },
    { value: "vehicle", label: "common.vehicles" },
    { value: "meal", label: "meal.meals" },
  ];

  static readonly ICONS: Record<string, LucideIcon> = {
    route: Route,
    calendar: CalendarDays,
    bus: Bus,
    user: UserRound,
    trend: TrendingUp,
    sms: MessageSquare,
    meal: UtensilsCrossed,
  };

  static readonly accentClasses: Record<
    AuroraAccent,
    { text: string; glow: string; ring: string; from: string }
  > = {
    cyan: {
      text: "text-cyan-700",
      glow: "shadow-[0_0_30px_-6px_rgba(34,211,238,0.55)]",
      ring: "ring-cyan-400/30",
      from: "from-cyan-500/25",
    },
    blue: {
      text: "text-blue-700",
      glow: "shadow-[0_0_30px_-6px_rgba(96,165,250,0.55)]",
      ring: "ring-blue-400/30",
      from: "from-blue-500/25",
    },
    violet: {
      text: "text-violet-700",
      glow: "shadow-[0_0_30px_-6px_rgba(167,139,250,0.55)]",
      ring: "ring-violet-400/30",
      from: "from-violet-500/25",
    },
    emerald: {
      text: "text-emerald-700",
      glow: "shadow-[0_0_30px_-6px_rgba(52,211,153,0.55)]",
      ring: "ring-emerald-400/30",
      from: "from-emerald-500/25",
    },
    amber: {
      text: "text-amber-700",
      glow: "shadow-[0_0_30px_-6px_rgba(251,191,36,0.55)]",
      ring: "ring-amber-400/30",
      from: "from-amber-500/25",
    },
    rose: {
      text: "text-rose-700",
      glow: "shadow-[0_0_30px_-6px_rgba(251,113,133,0.55)]",
      ring: "ring-rose-400/30",
      from: "from-rose-500/25",
    },
  };

  static readonly AURORA_ACCENTS = {
    cyan: "#22d3ee",
    blue: "#60a5fa",
    violet: "#a78bfa",
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#fb7185",
  } as const;
}

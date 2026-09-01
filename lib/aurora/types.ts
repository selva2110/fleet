import React from "react";
import { Driver } from "../driver/types";
import { FleetEvent } from "../events/types";
import { AuroraConfig } from "./config";
import { enTranslations } from "../locale/en/common";
import { MealDelivery } from "../meals/types";

export type LayerKey = "event" | "driver" | "vehicle" | "meal";

export type SelectedItem =
  | { kind: "event"; data: FleetEvent }
  | { kind: "meal"; data: MealDelivery }
  | { kind: "driver"; data: Driver }
  | null;

export type Entry = {
  key: string;
  start: number;
  end: number;
  title: string;
  subtitle?: string;
  sel: SelectedItem;
};

export type Placed = Entry & { col: number; cols: number };

export interface KpiItem {
  id: string;
  label: string;
  value: string | number;
  accent: AuroraAccent;
  icon: keyof typeof AuroraConfig.ICONS;
  trendUp: boolean;
  trend: string;
  series: number[];
  trendSublabel:string;
}

export type AuroraAccent = keyof typeof AuroraConfig.AURORA_ACCENTS;

export type AlertSeverity = "critical" | "warning" | "info";
export interface AuroraAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
}

export interface AuroraInsight {
  id: string;
  kind: "route" | "demand" | "attendance" | "fleet";
  title: string;
  detail: string;
  confidence: number;
}
export type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  loading: boolean;
  LanguageSelector: React.ComponentType<{ className?: string }>;
};

export type TranslationKey = keyof typeof enTranslations;
 
export type CalendarEventKind = "event" | "meal" | "driver" | "vehicle";
export type CalendarRecord = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  backgroundColor?: string;
  color?: string;
  Kind: CalendarEventKind;
  Data: FleetEvent | MealDelivery | Driver;
  resourceId?: string;
};

export type CalendarResource = {
  id: string;
  title: string;
};

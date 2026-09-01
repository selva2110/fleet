import { SortOption } from "@/components/data-view/data-view";
import { TransportConstraints } from "./types";
export class ParticipantConfig {

  static readonly constraintLabels: {
    key: string;
    label: string;
    short: string;
  }[] = [
    { key: "wheelchair", label: "part.wheelchaireq", short: "WC" },
    { key: "poweredWheelchair", label: "part.pwheelchair", short: "PWC" },
    { key: "oxygen", label: "part.oxygencylinder", short: "O2" },
  ];

  static readonly NEEDS_OPTIONS = this.constraintLabels.map((c) => ({
    value: c.key,
    label: c.label,
  }));

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "maxTravelMinutes", label: "common.maxTravel" },
  ];

  static readonly PRIORITY_LABELS: Record<string, string> = {
    routine: "part.routine",
    elevated: "part.elevated",
    critical: "part.critical",
  };

  static readonly CONSTRAINT_KEYS: {
    key: keyof TransportConstraints;
    label: string;
  }[] = [
    { key: "wheelchair", label: "part.wheelchair" },
    { key: "oxygen", label: "part.oxygen" },
    { key: "caregiverRequired", label: "part.carereq" },
  ];

  static readonly CONSTRAINT_LABELS: Record<string, string> = {
    wheelchair: "part.wheelchair",
    oxygen: "part.oxygen",
    caregiverRequired: "part.carereq",
  };
}

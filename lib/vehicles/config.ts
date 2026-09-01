import { SortOption } from "@/components/data-view/data-view";
import { Vehicle, VehicleStatus, VehicleType } from "./types";

export class VehiclesConfig {
  static readonly vehicleTypeImages: Record<VehicleType, string> = {
    Sedan: "/vehicles/sedan.png",
    SUV: "/vehicles/suv.png",
    Van: "/vehicles/van.png",
    "Wheelchair Accessible Van": "/vehicles/wheelchair-van.png",
    "Medical Transport Vehicle": "/vehicles/medical-transport.png",
    "Mini Bus": "/vehicles/mini-bus.png",
    "Shuttle Bus": "/vehicles/shuttle-bus.png",
    Ambulance: "/vehicles/ambulance.png",
  };

  static readonly vehicleTypeDescriptions: Record<VehicleType, string> = {
    Sedan: "vehicles.descriptions.sedan",
    SUV: "vehicles.descriptions.suv",
    Van: "vehicles.descriptions.van",
    "Wheelchair Accessible Van":
      "vehicles.descriptions.wheelchairAccessibleVan",
    "Medical Transport Vehicle": "vehicles.descriptions.medicalTransport",
    "Mini Bus": "vehicles.descriptions.miniBus",
    "Shuttle Bus": "vehicles.descriptions.shuttleBus",
    Ambulance: "vehicles.descriptions.ambulance",
  };

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "vehicles.sort.name" },
    { key: "type", label: "vehicles.sort.type" },
    { key: "capacity", label: "vehicles.sort.capacity" },
    { key: "wheelchairCapacity", label: "vehicles.sort.wheelchairCapacity" },
    { key: "status", label: "vehicles.sort.status" },
    { key: "maintenanceStatus", label: "vehicles.sort.maintenanceStatus" },
    { key: "fuelType", label: "vehicles.sort.fuelType" },
  ];

  static readonly vehicleStatusMeta: Record<
    VehicleStatus,
    { label: string; cls: string; map: string }
  > = {
    available: {
      label: "vehicles.status.available",
      cls: "bg-success/20 text-success",
      map: "#059669",
    },
    assigned: {
      label: "vehicles.status.assigned",
      cls: "bg-accent text-accent-foreground",
      map: "#3b82f6",
    },
    "heading-to-pickup": {
      label: "vehicles.status.headingToPickup",
      cls: "bg-primary/15 text-primary",
      map: "#2563eb",
    },
    onboard: {
      label: "vehicles.status.onboard",
      cls: "bg-primary/15 text-primary",
      map: "#2563eb",
    },
    "at-destination": {
      label: "vehicles.status.atDestination",
      cls: "bg-success/20 text-success",
      map: "#059669",
    },
    returning: {
      label: "vehicles.status.returning",
      cls: "bg-muted text-muted-foreground",
      map: "#64748b",
    },
    offline: {
      label: "vehicles.status.offline",
      cls: "bg-muted text-muted-foreground",
      map: "#94a3b8",
    },
  };

  static readonly maintMeta: Record<
    Vehicle["maintenanceStatus"],
    { label: string; cls: string }
  > = {
    good: { label: "vehicles.maintenance.good", cls: "text-success" },
    "due-soon": {
      label: "vehicles.maintenance.dueSoon",
      cls: "text-warning-foreground",
    },
    "service-required": {
      label: "vehicles.maintenance.serviceRequired",
      cls: "text-destructive",
    },
  };

  static readonly TYPE_OPTIONS: {
    value: VehicleType;
    label: string;
  }[] = [
    { value: "Sedan", label: "vehicles.types.sedan" },
    { value: "SUV", label: "vehicles.types.suv" },
    { value: "Van", label: "vehicles.types.van" },
    {
      value: "Wheelchair Accessible Van",
      label: "vehicles.types.wheelchairAccessibleVan",
    },
    {
      value: "Medical Transport Vehicle",
      label: "vehicles.types.medicalTransport",
    },
    { value: "Mini Bus", label: "vehicles.types.miniBus" },
    { value: "Shuttle Bus", label: "vehicles.types.shuttleBus" },
    { value: "Ambulance", label: "vehicles.types.ambulance" },
  ];

  static readonly TYPE_OPTIONS_LABEL = {
    Sedan: "vehicles.types.sedan",
    SUV: "vehicles.types.suv",
    Van: "vehicles.types.van",
    "Wheelchair Accessible Van": "vehicles.types.wheelchairAccessibleVan",
    "Medical Transport Vehicle": "vehicles.types.medicalTransport",
    "Mini Bus": "vehicles.types.miniBus",
    "Shuttle Bus": "vehicles.types.shuttleBus",
    Ambulance: "vehicles.types.ambulance",
  };

  static readonly STATUS_OPTIONS = Object.entries(this.vehicleStatusMeta).map(
    ([value, m]) => ({
      value,
      label: m.label,
    }),
  );

  static readonly MAINT_OPTIONS: {
    value: "good" | "due-soon" | "service-required";
    label: string;
  }[] = [
    { value: "good", label: "vehicles.maintenance.good" },
    { value: "due-soon", label: "vehicles.maintenance.dueSoon" },
    {
      value: "service-required",
      label: "vehicles.maintenance.serviceRequired",
    },
  ];

  static readonly CAPABILITY_OPTIONS = [
    { value: "liftAvailable", label: "vehicles.capabilities.liftAvailable" },
    { value: "wheelchair", label: "vehicles.capabilities.wheelchair" },
    {
      value: "oxygenEquipment",
      label: "vehicles.capabilities.oxygenEquipment",
    },
    {
      value: "bariatricCapable",
      label: "vehicles.capabilities.bariatricCapable",
    },
    {
      value: "stretcherCapable",
      label: "vehicles.capabilities.stretcherCapable",
    },
  ];

  static readonly TYPES = this.TYPE_OPTIONS;
  static readonly MAINT = this.MAINT_OPTIONS;

  static readonly VehicleTypes = Object.keys(
    this.vehicleTypeImages,
  ) as VehicleType[];

  static readonly TYPE_SPECS: Record<
    VehicleType,
    { seats: string; tags: string[] }
  > = {
    Sedan: {
      seats: "vehicles.specs.seats.sedan",
      tags: [
        "vehicles.specs.tags.ambulatory",
        "vehicles.specs.tags.fuelEfficient",
      ],
    },
    SUV: {
      seats: "vehicles.specs.seats.suv",
      tags: [
        "vehicles.specs.tags.highClearance",
        "vehicles.specs.tags.extraLegroom",
      ],
    },
    Van: {
      seats: "vehicles.specs.seats.van",
      tags: ["vehicles.specs.tags.groupTransport"],
    },
    "Wheelchair Accessible Van": {
      seats: "vehicles.specs.seats.wheelchairAccessibleVan",
      tags: ["vehicles.specs.tags.rampLift", "vehicles.specs.tags.securement"],
    },
    "Medical Transport Vehicle": {
      seats: "vehicles.specs.seats.medicalTransport",
      tags: ["vehicles.specs.tags.oxygen", "vehicles.specs.tags.nonEmergency"],
    },
    "Mini Bus": {
      seats: "vehicles.specs.seats.miniBus",
      tags: ["vehicles.specs.tags.midSizeGroups"],
    },
    "Shuttle Bus": {
      seats: "vehicles.specs.seats.shuttleBus",
      tags: ["vehicles.specs.tags.highCapacity", "vehicles.specs.tags.events"],
    },
    Ambulance: {
      seats: "vehicles.specs.seats.ambulance",
      tags: [
        "vehicles.specs.tags.emergency",
        "vehicles.specs.tags.criticalCare",
      ],
    },
  };

  static readonly FUEL_OPTIONS_LABEL: Record<Vehicle["fuelType"], string> = {
    Gas: "vehicles.fuels.gas",
    Diesel: "vehicles.fuels.diesel",
    Hybrid: "vehicles.fuels.hybrid",
    Electric: "vehicles.fuels.electric",
  };

  static readonly FUEL_OPTIONS = (
    Object.entries(this.FUEL_OPTIONS_LABEL) as [Vehicle["fuelType"], string][]
  ).map(([value, label]) => ({
    value,
    label,
  }));
}

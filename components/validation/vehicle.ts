import { VehiclesConfig } from "@/lib/vehicles/config";
import { z } from "zod";

export const createVehicleFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(5, t("val.vehicleNameMin"))
      .max(100, t("val.vehicleNameMax")),
    type: z.enum(
      VehiclesConfig.TYPES.map((item) => item.value) as [string, ...string[]],
    ),
    address: z.string().trim().min(5, t("val.baseAddressRequired")),
    location: z.any().nullable(),
    capacity: z
      .number()
      .int(t("val.capacityWhole"))
      .min(1, t("val.capacityMin")),
    wheelchairCapacity: z.number().int().min(0, t("val.wheelchairCapacityMin")),
    oxygenEquipment: z.boolean(),
    liftAvailable: z.boolean(),
    bariatricCapable: z.boolean(),
    stretcherCapable: z.boolean(),
    fuelType: z.enum(
      VehiclesConfig.FUEL_OPTIONS.map((item) => item.value) as [string, ...string[]],
    ),
    maintenanceStatus: z.enum(
      VehiclesConfig.MAINT.map((item) => item.value) as [string, ...string[]],
    ),
    imageUrl: z.string().nullable(),
  });``

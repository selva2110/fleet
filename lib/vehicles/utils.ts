import { VehiclesConfig } from "./config";
import { Vehicle, VehicleForm, VehicleType } from "./types";

export class VehicleUtils {
  static vehicleImage(type: VehicleType, override?: string | null): string {
    return override && override.trim()
      ? override
      : VehiclesConfig.vehicleTypeImages[type];
  }
  static hasCapability(v: Vehicle, cap: string): boolean {
    if (cap === "wheelchair") return v.wheelchairCapacity > 0;
    return Boolean(v[cap as keyof Vehicle]);
  }

  static blankVehicle(): VehicleForm {
    return {
      name: "",
      type: "Van",
      address: "",
      location: null,
      capacity: 6,
      wheelchairCapacity: 0,
      oxygenEquipment: false,
      liftAvailable: false,
      bariatricCapable: false,
      stretcherCapable: false,
      fuelType: "Gas",
      maintenanceStatus: "good",
      imageUrl: null,
    };
  }
}

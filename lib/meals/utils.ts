import { todayLocalDate } from "../date";
import { MealsConfig } from "./config";
import { MealDelivery, MealRunForm } from "./types";

export class MealsUtils {
  static blankMealRun(centerId: string): MealRunForm {
    return {
      centerId,
      vehicleId: null,
      driverId: null,
      mealType: "Lunch",
      date: todayLocalDate(),
      departTime: "11:30",
      participantIds: [],
    };
  }

  static mealVehicleIconMarkup(m: MealDelivery, highlighted: boolean) {
    const color = MealsConfig.mealStatusMeta[m.status].map;
    const pulse = m.status === "en-route" || m.status === "delivering";
    const size = highlighted ? 36 : 30;
    return `
    <div class="map-marker ${pulse ? "map-marker-pulse" : ""}" style="--pulse-color:${color}66;width:${size}px;height:${size}px;background:${color};${highlighted ? "outline:3px solid rgba(217,119,6,.4);" : ""}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7h9v8H3zM12 10h4l3 3v2h-7z" fill="white" fill-opacity="0.18" />
        <circle cx="7" cy="16.5" r="1.6" fill="white" stroke="none" />
        <circle cx="16" cy="16.5" r="1.6" fill="white" stroke="none" />
        <path d="M6 4.5c1.6 0 1.6 1.4 3 1.4s1.4-1.4 3-1.4" />
      </svg>
    </div>`;
  }

  static mealStopIconMarkup(delivered: boolean) {
    const color = delivered ? "#059669" : "#d97706";
    return `
    <div class="map-marker" style="width:16px;height:16px;background:${color};border-width:2px;border-radius:4px;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        ${delivered ? '<path d="M5 13l4 4L19 7" />' : '<path d="M4 8h16v11H4zM4 8l2-3h12l2 3" />'}
      </svg>
    </div>`;
  }
}

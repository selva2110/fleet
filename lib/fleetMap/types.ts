import { Center } from "../events/types";
import { MealDelivery } from "../meals/types";
import { Participant } from "../participant/types";
import { Stop, Trip } from "../trips/types";
import { LatLng } from "../types";
import { Vehicle } from "../vehicles/types";

export type TrafficResult = {
  available: boolean;
  routePath?: LatLng[];
  travelTimeMinutes?: number;
  trafficDelayMinutes?: number;
  updatedAt?: string;
};
export type TooltipInfo = {
  longitude: number;
  latitude: number;
  title: string;
  subtitle?: string;
};

export interface FleetMapProps {
  centers: Center[];
  vehicles: Vehicle[];
  trips: Trip[];
  mealDeliveries?: MealDelivery[];
  participants?: Participant[];
  highlightTripId?: string | null;
  highlightTripIds?: string[];
  highlightVehicleId?: string | null;
  highlightMealId?: string | null;
  onSelectTrip?: (tripId: string) => void;
  onSelectMeal?: (mealId: string) => void;
  fitTo?: LatLng[];
  recommendedRoute?: {
    routePath: LatLng[];
    stops: Stop[];
    routeId: string;
    origin?: LatLng;
    destination?: LatLng;
    fallbackMinutes?: number;
  }[];
  className?: string;
  recommendedRouteId?: string;
  setRecommendedRoute?: (routeId: string | null) => void;
}

export interface LiveTrafficProps {
  routes: {
    origin: LatLng;
    stops: Stop[];
    destination: LatLng;
    fallbackMinutes: number;
  }[];
  onResult: (index: number, result: TrafficResult) => void;
}

export type MapboxSimpleMapProps = {
  location: LatLng | null | undefined;
  label?: string;
  onLocationChange?: (value: LatLng) => void;
  draggable?: boolean;
  className?: string;
  emptyMessage?: string;
  placeholder?: string;
};

import { z } from "zod";

export const createMealRunSchema = (t: (key: string) => string) =>
  z.object({
    centerId: z.string().min(1, t("val.pickupCenterRequired")),
    vehicleId: z
      .string()
      .nullable()
      .refine((value) => !!value, { message: t("val.vehicleRequired") }),
    driverId: z
      .string()
      .nullable()
      .refine((value) => !!value, { message: t("val.driverRequired") }),
    date: z.string().min(1, t("val.mealdateRequired")),
    departTime: z.string().min(1, t("val.departureTimeRequired")),
    mealType: z.enum(["Breakfast", "Lunch", "Dinner"], {
      message: t("val.mealTypeRequired"),
    }),
    participantIds: z.array(z.string()).min(1, t("val.participantRequired")),
  });

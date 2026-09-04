import { z } from "zod";

export const createMealRunSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("val.mealRunNameRequired")),
    centerId: z.string().min(1, t("val.pickupCenterRequired")),
    vehicleId: z.string().nullable().optional(),
    driverId: z.string().nullable().optional(),
    fromdate: z.string().min(1, t("val.mealdateRequired")),
    todate: z.string().min(1, t("val.mealdateRequired")),
    departTime: z.string().min(1, t("val.departureTimeRequired")),
    typeId: z.union([z.string(), z.number()], {
      message: t("val.mealTypeRequired"),
    }),
    participantIds: z.array(z.string()).min(1, t("val.participantRequired")),
  });

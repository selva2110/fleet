import { z } from "zod";

export const createMealRunSchema = (t: (key: string) => string) =>
  z
    .object({
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
      groupIds: z.array(z.union([z.string(), z.number()])),
      participants: z.array(
        z.object({
          participantId: z.string(),
          mealOption: z.string(),
          dietPlan: z.string(),
          mealNotes: z.string(),
          medicalNotes: z.string(),
        }),
      ),
    })
    .refine(
      (data) => data.groupIds.length > 0 || data.participants.length > 0,
      { message: t("val.participantRequired"), path: ["participants"] },
    );

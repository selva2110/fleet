import { z } from "zod";

export const createDriverFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t("val.nameMin"))
        .max(100, t("val.nameMax")),
      mobile_number: z.string().trim().length(10, t("val.phoneInvalid")),
      address: z.string().trim().min(5, t("val.addressRequired")),
      location: z.any().nullable(),
      license_number: z.string().trim().min(1, t("val.licenseRequired")),
      certifications: z.object({
        wheelchairAssist: z.object({
          enabled: z.boolean(),
          certificateNo: z.string(),
        }),
        medicalTransport: z.object({
          enabled: z.boolean(),
          certificateNo: z.string(),
        }),
      }),
      assignedVehicleId: z.string().nullable(),
      rating: z.number().min(0, t("val.ratingMin")).max(5, t("val.ratingMax")),
      shiftStart: z.string().min(1, t("val.shiftStartRequired")),
      shiftEnd: z.string().min(1, t("val.shiftEndRequired")),
      shiftDays: z.array(z.number()).min(1, t("val.shiftDaysRequired")),
      imageUrl: z.string().nullable().optional(),
    })
    .refine(
      (data) => {
        const [startH, startM] = data.shiftStart.split(":").map(Number);
        const [endH, endM] = data.shiftEnd.split(":").map(Number);
        const start = startH * 60 + startM;
        const end = endH * 60 + endM;
        return end > start;
      },
      {
        message: t("val.shiftEndAfterStart"),
        path: ["shiftEnd"],
      },
    );

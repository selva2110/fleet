import { z } from "zod";

const recurrenceSchema = z.object({
  type: z.enum(["one-time", "daily", "weekly", "monthly"]),
  interval: z.number().int().min(1),
  weekdays: z.array(z.number().int().min(0).max(6)),
  monthDay: z.number().int().min(1).max(31),
  monthlyMode: z.enum(["day-of-month", "nth-weekday"]),
  nthWeek: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(-1),
  ]),
  nthWeekday: z.number().int().min(0).max(6),
});

export const createDriverShiftSchema = (t: (key: string) => string) =>
  z
    .object({
      driverId: z.string().min(1, t("Driver Required")),
      startDate: z.string().min(1, t("val.shiftStartDateRequired")),
      endDate: z.string().min(1, t("End date is required")),
      startTime: z.string().min(1, t("val.startTimeRequired")),
      endTime: z.string().min(1, t("val.endTimeRequired")),
      timezone: z.string(),
      recurrence: recurrenceSchema,
      notes: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.startTime && data.endTime && data.endTime <= data.startTime) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: t("val.endTimeAfterStart"),
        });
      }

      if (data.endDate && data.startDate && data.endDate < data.startDate) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: t("val.shiftEndDateBeforeStart"),
        });
      }

      if (
        data.recurrence.type === "weekly" &&
        data.recurrence.weekdays.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["weekdays"],
          message: t("val.shiftDaysRequired"),
        });
      }
    });

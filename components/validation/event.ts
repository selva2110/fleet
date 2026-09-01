import { z } from "zod";

export const createEventSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(5, t("val.nameRequired")),
      type: z.string(),
      centerId: z.string().min(1, t("val.centerRequired")),
      date: z.string().min(1, t("val.dateRequired")),
      startTime: z.string().min(1, t("val.startTimeRequired")),
      endTime: z.string().min(1, t("val.endTimeRequired")),
      expectedAttendance: z.number().int().optional(),
      participantIds: z.array(z.string()).optional(),
      roundTrip: z.boolean(),
      returnTime: z.string().nullable().optional(),
      registrationDeadline: z.string().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(`${data.date}T00:00:00`);
      if (selectedDate < today) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: t("val.dateMustBeTodayOrFuture"),
        });
      }

      if (data.roundTrip && data.returnTime) {
        if (data.returnTime <= data.endTime) {
          ctx.addIssue({
            code: "custom",
            path: ["returnTime"],
            message: t("val.returnTimeAfterEnd"),
          });
        }
      }

      if (data.startTime && data.endTime) {
        if (data.startTime >= data.endTime) {
          ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: t("val.endTimeAfterStart"),
          });
        }
      }

      //Registration Deadline

      // if (!data.registrationDeadline) {
      //   ctx.addIssue({
      //     code: "custom",
      //     path: ["registrationDeadline"],
      //     message: "Please provide a Registration Deadline for the event",
      //   });
      //   return;
      // }
      // const deadline = new Date(data.registrationDeadline);
      // const eventDate = new Date(`${data.date}T00:00:00`);
      // const minDeadline = new Date(eventDate);
      // minDeadline.setDate(minDeadline.getDate() - 1);
      // if (deadline > minDeadline) {
      //   ctx.addIssue({
      //     code: "custom",
      //     path: ["registrationDeadline"],
      //     message:
      //       "Registration deadline must be at least one day before the event date",
      //   });
      // }
      // const eventStart = new Date(`${data.date}T${data.startTime}`);

      // if (deadline >= eventStart) {
      //   ctx.addIssue({
      //     code: "custom",
      //     path: ["registrationDeadline"],
      //     message: "Registration deadline cannot be after the event start time",
      //   });
      // }
    });

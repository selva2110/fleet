import { z } from "zod";

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const ContactDetailsSchema = z.object({
  name: z.string().trim(),
  phone: z.string().trim(),
  address: z.string().trim(),
  dialCode: z.string().trim(),
  location: LocationSchema.nullable(),
  relation: z.string().trim(),
});

export const createParticipantFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t("val.nameMin"))
        .max(100, t("val.nameMax")),
      dialCode: z.string().trim().min(1, t("val.dialCodeRequired")),
      phone: z
        .string()
        .trim()
        .min(7, t("val.phoneInvalid"))
        .max(15, t("val.phoneTooLong")),
      emergencyContact: z.string().trim().optional(),
      bloodGroup: z.string().trim().min(1, "Blood group is required"),
      address: z.string().trim().min(5, t("val.addressRequired")),
      location: LocationSchema,
      pickupWindow: z.string().optional(),
      medicalNotes: z.string().max(500, t("val.medicalNotesMax")),
      constraints: z.looseObject({}),
      maxTravelMinutes: z.number().int().optional(),
      companionNeeded: z.boolean(),
      companionDetails: ContactDetailsSchema,
      emergencyContactDetails: ContactDetailsSchema,
    })
    .superRefine((data, ctx) => {
      if (
        data.address.trim() &&
        data.location.lat === 0 &&
        data.location.lng === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message: t("val.locationRequired"),
        });
      }

      requireContactDetails(
        data.emergencyContactDetails,
        "emergencyContactDetails",
        "Emergency contact",
        ctx,
        t,
      );

      if (data.companionNeeded) {
        requireContactDetails(
          data.companionDetails,
          "companionDetails",
          "Companion",
          ctx,
          t,
        );
      }
    });

function requireContactDetails(
  details: z.infer<typeof ContactDetailsSchema>,
  prefix: string,
  label: string,
  ctx: z.RefinementCtx,
  t: (key: string) => string,
) {
  if (!details.name.trim()) {
    ctx.addIssue({
      code: "custom",
      path: [prefix, "name"],
      message: `${label} name is required`,
    });
  }
  if (!details.phone.trim() || details.phone.trim().length < 7) {
    ctx.addIssue({
      code: "custom",
      path: [prefix, "phone"],
      message: `${label} phone is required`,
    });
  }
  if (!details.address.trim()) {
    ctx.addIssue({
      code: "custom",
      path: [prefix, "address"],
      message: `${label} address is required`,
    });
  } else if (
    !details.location ||
    (details.location.lat === 0 && details.location.lng === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: [prefix, "location"],
      message: t("val.locationRequired"),
    });
  }
  if (!details.relation.trim()) {
    ctx.addIssue({
      code: "custom",
      path: [prefix, "relation"],
      message: `${label} relation is required`,
    });
  }
}

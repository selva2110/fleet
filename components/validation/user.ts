import { z } from "zod";

// Password/confirmPassword are optional when editing (blank = keep the
// current password) but must satisfy the same rules and match when set.
export const createUserFormSchema = (t: (key: string) => string, isEditing: boolean) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t("val.nameMin"))
        .max(100, t("val.nameMax")),
      email: z
        .string()
        .trim()
        .min(1, t("val.emailRequired"))
        .pipe(z.email(t("val.emailInvalid"))),
      address: z.string().trim().min(5, t("val.addressRequired")),
      roleIds: z.array(z.number()).min(1, t("val.roleRequired")),
      status: z.boolean(),
      phone: z.string().trim().optional(),
      bloodGroup: z.string().trim().optional(),
      emergencyContactName: z.string().trim().optional(),
      emergencyContactPhone: z.string().trim().optional(),
      centerId: z.string().trim().optional(),
      password: isEditing
        ? z.union([z.literal(""), z.string().min(8, t("val.passwordMin8")).regex(/[0-9]/, t("val.passwordNeedsNumber"))])
        : z.string().min(8, t("val.passwordMin8")).regex(/[0-9]/, t("val.passwordNeedsNumber")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("val.passwordsMismatch"),
      path: ["confirmPassword"],
    });

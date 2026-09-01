import { z } from "zod";

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const OTP_LENGTH = 6;

export const createLoginFormSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("val.emailRequired"))
      .pipe(z.email(t("val.emailInvalid"))),
    password: z.string().min(1, t("val.passwordRequired")),
  });

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;

export const createRegisterFormSchema = (t: (key: string) => string) =>
  z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, t("val.fullNameRequired")),
        // .max(100, t("val.nameMax")),
      email: z
        .string()
        .trim()
        .min(1, t("val.emailRequired")),
        // .email(t("val.emailInvalid")),
      phone: z
        .string()
        .trim()
        .optional(),
        // .refine((v) => !v || /^\d{10}$/.test(v), {
        //   message: t("val.phone10Digit"),
        // }),
      password: z
        .string()
        .min(8, t("val.passwordMin8"))
        .regex(/[0-9]/, t("val.passwordNeedsNumber")),
      confirmPassword: z.string().min(1, t("val.confirmPasswordRequired")),
      agreeToTerms: z
        .boolean()
        .refine((v) => v === true, t("val.termsRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("val.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;

export const createForgotPasswordRequestSchema = (t: (key: string) => string) =>
  z.object({
    identifier: z
      .string()
      .trim()
      .min(1, t("val.identifierRequired"))
      .refine((v) => EMAIL_REGEX.test(v) || PHONE_REGEX.test(v), {
        message: t("val.identifierInvalid"),
      }),
  });

export type ForgotPasswordRequestValues = z.infer<
  ReturnType<typeof createForgotPasswordRequestSchema>
>;

export const createOtpSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .length(OTP_LENGTH, t("val.otpInvalid"))
      .regex(/^\d+$/, t("val.otpInvalid")),
  });

export type OtpValues = z.infer<ReturnType<typeof createOtpSchema>>;

export const createResetPasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      password: z
        .string()
        .min(8, t("val.passwordMin8"))
        .regex(/[0-9]/, t("val.passwordNeedsNumber")),
      confirmPassword: z.string().min(1, t("val.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("val.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export type ResetPasswordValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;

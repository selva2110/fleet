"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { OtpInput } from "@/components/ui/otp-input";
import { Field, TextField } from "@/components/crud/form-fields";
import {
  OTP_LENGTH,
  createForgotPasswordRequestSchema,
  createOtpSchema,
  createResetPasswordSchema,
} from "@/components/validation/auth";
import { validateSchema } from "@/components/validation/zod-validation";
import { useTranslation } from "@/components/context/language-provider";
import { ResetPasswordForm } from "@/lib/auth/types";
import { useNotifications } from "@/components/context/notification-provider";

type Step = "request" | "verify" | "reset" | "done";

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const ForgotPasswordRequestSchema = useMemo(
    () => createForgotPasswordRequestSchema(t),
    [t],
  );
  const OtpSchema = useMemo(() => createOtpSchema(t), [t]);
  const ResetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);
  const { addToast } = useNotifications();

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [resetForm, setResetForm] = useState<ResetPasswordForm>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const setResetField = <K extends keyof ResetPasswordForm>(
    k: K,
    v: ResetPasswordForm[K],
  ) => {
    setResetForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const isValid = validateSchema(
      ForgotPasswordRequestSchema,
      { identifier },
      setErrors,
    );
    if (!isValid) {
      addToast({
        title: t("common.validationfailed"),
        message: t("common.fixhighlightedfields"),
        kind: "danger",
      });
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setCode("");
      setFormNotice(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("verify");
      addToast({ title: t("common.success"), message: t("auth.codeSentToast"), kind: "success" });
    } catch {
      setFormError(t("auth.genericError"));
      addToast({ title: "Failed", message: t("auth.genericError"), kind: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const isValid = validateSchema(OtpSchema, { code }, setErrors);
    if (!isValid) {
      addToast({
        title: t("common.validationfailed"),
        message: t("common.fixhighlightedfields"),
        kind: "danger",
      });
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStep("reset");
      addToast({ title: t("common.success"), message: t("auth.codeVerifiedToast"), kind: "success" });
    } catch {
      setFormError(t("auth.invalidCode"));
      addToast({ title: "Failed", message: t("auth.invalidCode"), kind: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0 || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setFormNotice(t("auth.codeSent"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const isValid = validateSchema(ResetPasswordSchema, resetForm, setErrors);
    if (!isValid) {
      addToast({
        title: t("common.validationfailed"),
        message: t("common.fixhighlightedfields"),
        kind: "danger",
      });
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStep("done");
      addToast({ title: t("common.success"), message: t("auth.passwordResetToast"), kind: "success" });
      window.setTimeout(() => router.push("/login"), 1600);
    } catch {
      setFormError(t("auth.genericError"));
      addToast({ title: "Failed", message: t("auth.genericError"), kind: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      {step === "request" ? (
        <>
          <CardHeader className="gap-1 px-6 pt-6">
            <CardTitle className="text-xl">
              {t("auth.forgotPasswordTitle")}
            </CardTitle>
            <CardDescription>{t("auth.forgotPasswordDesc")}</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={handleRequestCode}
              noValidate
            >
              <TextField
                label={t("auth.emailOrPhone")}
                value={identifier}
                onChange={(v) => {
                  setIdentifier(v);
                  setErrors((e) => (e.identifier ? { ...e, identifier: "" } : e));
                }}
                placeholder={t("auth.emailOrPhonePlaceholder")}
                required
                error={errors.identifier}
              />

              {formError ? (
                <p className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-1 h-9 w-full"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("auth.sendCode")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                {t("auth.backToSignIn")}
              </Link>
            </p>
          </CardContent>
        </>
      ) : null}

      {step === "verify" ? (
        <>
          <CardHeader className="gap-1 px-6 pt-6">
            <CardTitle className="text-xl">
              {t("auth.enterCodeTitle")}
            </CardTitle>
            <CardDescription>
              {t("auth.enterCodeDesc")
                .replace("{{length}}", String(OTP_LENGTH))
                .replace("{{identifier}}", identifier)}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={handleVerifyCode}
              noValidate
            >
              <OtpInput
                label={t("auth.verificationCode")}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setErrors((e) => (e.code ? { ...e, code: "" } : e));
                }}
                error={errors.code}
                autoFocus
              />

              {formNotice ? (
                <p className="text-sm font-medium text-primary">{formNotice}</p>
              ) : null}

              {formError ? (
                <p className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-1 h-9 w-full"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("auth.verifyCode")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.didntGetCode")}{" "}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0 || submitting}
                className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {cooldown > 0
                  ? t("auth.resendCodeIn").replace(
                      "{{seconds}}",
                      String(cooldown),
                    )
                  : t("auth.resendCode")}
              </button>
            </p>
          </CardContent>
        </>
      ) : null}

      {step === "reset" ? (
        <>
          <CardHeader className="gap-1 px-6 pt-6">
            <CardTitle className="text-xl">
              {t("auth.setNewPasswordTitle")}
            </CardTitle>
            <CardDescription>{t("auth.setNewPasswordDesc")}</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={handleResetPassword}
              noValidate
            >
              <Field
                label={t("auth.newPassword")}
                required
                error={errors.password}
              >
                <PasswordInput
                  value={resetForm.password}
                  onChange={(v) => setResetField("password", v)}
                  placeholder={t("auth.passwordMinHint")}
                  aria-invalid={errors.password ? true : undefined}
                />
              </Field>

              <Field
                label={t("auth.confirmPassword")}
                required
                error={errors.confirmPassword}
              >
                <PasswordInput
                  value={resetForm.confirmPassword}
                  onChange={(v) => setResetField("confirmPassword", v)}
                  placeholder={t("auth.reenterPassword")}
                  aria-invalid={errors.confirmPassword ? true : undefined}
                />
              </Field>

              {formError ? (
                <p className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-1 h-9 w-full"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("auth.resetPassword")}
              </Button>
            </form>
          </CardContent>
        </>
      ) : null}

      {step === "done" ? (
        <CardContent className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("auth.passwordResetSuccess")}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

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
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { OtpInput } from "@/components/ui/otp-input";
import { Field, TextField } from "@/components/crud/form-fields";
import {
  OTP_LENGTH,
  createOtpSchema,
  createRegisterFormSchema,
} from "@/components/validation/auth";
import { validateSchema } from "@/components/validation/zod-validation";
import { useTranslation } from "@/components/context/language-provider";
import { useNotifications } from "@/components/context/notification-provider";

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const RESEND_COOLDOWN_SECONDS = 30;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const RegisterFormSchema = useMemo(() => createRegisterFormSchema(t), [t]);
  const OtpSchema = useMemo(() => createOtpSchema(t), [t]);
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const set = <K extends keyof RegisterForm>(k: K, v: RegisterForm[K]) => {
    setRegisterForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const verificationIdentifier = registerForm.email || registerForm.phone;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const isValid = validateSchema(RegisterFormSchema, registerForm, setErrors);
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
      // No auth backend is wired up yet — this just simulates the request.
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
      // No auth backend is wired up yet — this just simulates the request.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStep("done");
      addToast({ title: t("common.success"), message: t("auth.accountVerifiedToast"), kind: "success" });
      window.setTimeout(() => router.push("/login"), 1600);
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

  if (step === "verify") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-1 px-6 pt-6">
          <CardTitle className="text-xl">
            {t("auth.verifyAccountTitle")}
          </CardTitle>
          <CardDescription>
            {t("auth.verifyAccountDesc")
              .replace("{{length}}", String(OTP_LENGTH))
              .replace("{{identifier}}", verificationIdentifier)}
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
                ? t("auth.resendCodeIn").replace("{{seconds}}", String(cooldown))
                : t("auth.resendCode")}
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "done") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("auth.accountVerified")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="gap-1 px-6 pt-6">
        <CardTitle className="text-xl">{t("auth.createAccount")}</CardTitle>
        <CardDescription>{t("auth.registerDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextField
            label={t("common.fullname")}
            value={registerForm.fullName}
            onChange={(v) => set("fullName", v)}
            placeholder={t("auth.fullNamePlaceholder")}
            required
            error={errors.fullName}
          />

          <TextField
            label={t("auth.email")}
            type="email"
            value={registerForm.email}
            onChange={(v) => set("email", v)}
            placeholder={t("auth.emailPlaceholder")}
            required
            error={errors.email}
          />

          <TextField
            label={t("common.phone")}
            type="tel"
            value={registerForm.phone}
            onChange={(v) => set("phone", v)}
            placeholder={t("auth.phonePlaceholder")}
            error={errors.phone}
          />

          <Field label={t("auth.password")} required error={errors.password}>
            <PasswordInput
              value={registerForm.password}
              onChange={(v) => set("password", v)}
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
              value={registerForm.confirmPassword}
              onChange={(v) => set("confirmPassword", v)}
              placeholder={t("auth.reenterPassword")}
              aria-invalid={errors.confirmPassword ? true : undefined}
            />
          </Field>

          <div>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
              <Checkbox
                className="mt-0.5"
                checked={registerForm.agreeToTerms}
                onCheckedChange={(v) => set("agreeToTerms", v)}
                aria-invalid={errors.agreeToTerms ? true : undefined}
              />
              <span>
                {t("auth.agreeToThe")}{" "}
                <Link
                  href="#"
                  className="font-medium text-primary hover:underline"
                >
                  {t("auth.termsOfService")}
                </Link>{" "}
                {t("auth.and")}{" "}
                <Link
                  href="#"
                  className="font-medium text-primary hover:underline"
                >
                  {t("auth.privacyPolicy")}
                </Link>
                .
              </span>
            </label>
            {errors.agreeToTerms ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {errors.agreeToTerms}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          ) : null}

          <Button
            type="submit"
            className="mt-1 h-9 w-full"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("auth.createAccountButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

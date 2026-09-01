"use client";

import React, { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { TextField } from "@/components/crud/form-fields";
import { createLoginFormSchema } from "@/components/validation/auth";
import { validateSchema } from "@/components/validation/zod-validation";
import { useTranslation } from "@/components/context/language-provider";
import { LoginForm } from "@/lib/auth/types";
import { loginUser } from "@/lib/api/auth";
import { useNotifications } from "@/components/context/notification-provider";
import { createFieldSetter } from "@/components/common";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const LoginFormSchema = useMemo(() => createLoginFormSchema(t), [t]);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = createFieldSetter(setLoginForm, setErrors);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useNotifications();

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault();
    setFormError(null);
    const isValid = validateSchema(LoginFormSchema, loginForm, setErrors);
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
      const result = await loginUser(loginForm);
      if (!result.success) {
        const message = result.error ?? t("auth.genericError");
        setFormError(message);
        addToast({ title: t("auth.loginFailed"), message, kind: "danger" });
        return;
      }
      addToast({ title: t("common.success"), message: t("auth.signedInToast"), kind: "success" });
      router.push(callbackUrl);
    } catch {
      const message = t("auth.genericError");
      setFormError(message);
      addToast({ title: t("auth.loginFailed"), message, kind: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="gap-1 px-6 pt-6">
        <CardTitle className="text-xl">{t("auth.welcomeBack")}</CardTitle>
        <CardDescription>{t("auth.signInDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextField
            label={t("auth.email")}
            type="email"
            value={loginForm.email}
            onChange={(v) => set("email", v)}
            placeholder={t("auth.emailPlaceholder")}
            required
            error={errors.email}
          />

          <PasswordInput
            label={t("auth.password")}
            value={loginForm.password}
            error={errors.password}
            onChange={(v) => set("password", v)}
            placeholder={t("auth.enterPassword")}
            aria-invalid={errors.password ? true : undefined}
          />

          <div className="flex items-center justify-between">
            {/* <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={loginForm.rememberMe}
                onCheckedChange={(v) => set("rememberMe", v === true)}
              />
              {t("auth.rememberMe")}
            </label> */}
            {/* <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link> */}
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
            {t("auth.signIn")}
          </Button>
        </form>

        {/* <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            {t("auth.createOne")}
          </Link>
        </p> */}
      </CardContent>
    </Card>
  );
}

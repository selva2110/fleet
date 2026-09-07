"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/components/context/language-provider";
import { useNotifications } from "@/components/context/notification-provider";
import { completeMicrosoftLogin, startMicrosoftLogin } from "@/lib/api/auth";
import {
  consumePostLoginRedirect,
  microsoftSsoErrorMessageKey,
  parseMicrosoftCallbackFragment,
} from "@/lib/auth/microsoft-sso";

type Status = "processing" | "error";

export default function MicrosoftCallbackPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The redirect chain (Azure -> auth service -> here) can in some browsers
  // re-fire effects/navigations; guard so we only ever process the fragment
  // once instead of double-submitting or double-toasting.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function run() {
      const fragment = parseMicrosoftCallbackFragment(window.location.hash);
      // Tokens must never linger in the URL bar/history once read.
      window.history.replaceState(null, "", window.location.pathname);

      if (fragment.error) {
        console.error("Microsoft SSO failed:", fragment.error);
        fail(t(microsoftSsoErrorMessageKey(fragment.error)));
        return;
      }

      if (!fragment.accessToken) {
     
        fail(t("auth.ssoErrorGeneric"));
        return;
      }

      try {
        const result = await completeMicrosoftLogin({
          accessToken: fragment.accessToken,
          refreshToken: fragment.refreshToken,
        });
        if (!result.success) {
          fail(result.error ?? t("auth.ssoErrorGeneric"));
          return;
        }
        addToast({
          title: t("common.success"),
          message: t("auth.signedInToast"),
          kind: "success",
        });
        router.replace(consumePostLoginRedirect());
      } catch (error) {
        console.error("Unexpected error completing Microsoft sign-in:", error);
        fail(t("auth.ssoErrorGeneric"));
      }
    }

    function fail(message: string) {
      setErrorMessage(message);
      setStatus("error");
      addToast({ title: t("auth.ssoErrorTitle"), message, kind: "danger" });
    }

    run();
    // Intentionally run once on mount — the fragment is only meaningful on
    // the initial load of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "processing") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t("auth.ssoCallbackProcessing")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-1 px-6 pt-6 text-center">
        <AlertCircle className="mb-1 size-8 text-destructive" />
        <CardTitle className="text-xl">{t("auth.ssoErrorTitle")}</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-6 pb-6">
        <Button
          type="button"
          className="h-9 w-full"
          onClick={() => {
            startMicrosoftLogin();
          }}
        >
          {t("auth.ssoTryAgain")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full"
          onClick={() => router.replace("/login")}
        >
          {t("auth.ssoBackToLogin")}
        </Button>
      </CardContent>
    </Card>
  );
}

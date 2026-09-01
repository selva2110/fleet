"use client";

import { useTranslation } from "@/components/context/language-provider";

export function AuthBrandingCopy() {
  const { t } = useTranslation();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-semibold leading-tight">
        {t("auth.brandHeadline")}
      </h1>
      <p className="text-sm text-sidebar-foreground/70">{t("auth.brandDesc")}</p>
    </div>
  );
}

export function AuthCopyright() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-sidebar-foreground/50">
      © {new Date().getFullYear()} CareVoy. {t("auth.allRightsReserved")}
    </p>
  );
}

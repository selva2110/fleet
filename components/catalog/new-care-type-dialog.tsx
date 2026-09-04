"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/crud/form-fields";
import { useTranslation } from "../context/language-provider";
import { useCatalogMutations } from "@/lib/catalog/hooks";
import { CatalogConfig } from "@/lib/catalog/config";
import { CatalogUtils } from "@/lib/catalog/utils";
import { CareItemType, CareStatus } from "@/lib/catalog/types";

export function NewCareTypeDialog({
  open,
  onOpenChange,
  editingType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingType?: CareItemType | null;
}) {
  const { createCareItemType } = useCatalogMutations();
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    editingType
      ? {
          code: editingType.code,
          name: editingType.name,
          description: editingType.description,
          status: editingType.status,
        }
      : CatalogUtils.blankCareItemTypeForm(),
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      editingType
        ? {
            code: editingType.code,
            name: editingType.name,
            description: editingType.description,
            status: editingType.status,
          }
        : CatalogUtils.blankCareItemTypeForm(),
    );
  }, [open, editingType]);

  function reset() {
    setForm(CatalogUtils.blankCareItemTypeForm());
  }

  async function submit() {
    await createCareItemType(form, editingType?.id);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editingType ? t("catalog.editcaretype") : t("catalog.createcaretype")}
          </DialogTitle>
          <DialogDescription>{t("catalog.caretypedesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="type-code">{t("common.code")}</Label>
            <Input
              id="type-code"
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
              placeholder={t("catalog.codeplaceholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type-name">{t("common.name")}</Label>
            <Input
              id="type-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={t("catalog.typenameplaceholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type-description">{t("catalog.description")}</Label>
            <Textarea
              id="type-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder={t("catalog.typedescplaceholder")}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="item-status">{t("common.status")}</Label>
          <SelectField
            label=""
            value={form.status}
            options={CatalogConfig.STATUS_OPTIONS}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                status: event as CareStatus,
              }))
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>
            {editingType ? t("common.savchanges") : t("catalog.createtype")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

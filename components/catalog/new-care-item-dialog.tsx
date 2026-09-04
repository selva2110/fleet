"use client";

import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectField } from "@/components/crud/form-fields";
import { createFieldSetter } from "../common";
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import { useCareItemTypes, useCatalogMutations } from "@/lib/catalog/hooks";
import { CatalogConfig } from "@/lib/catalog/config";
import { CatalogUtils } from "@/lib/catalog/utils";
import { CareItem, CareItemForm, CareStatus } from "@/lib/catalog/types";

export function NewCareItemDialog({
  open,
  onOpenChange,
  editingItem,
  defaultTypeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingItem?: CareItem | null;
  defaultTypeId: string;
}) {
  const { careItemTypes } = useCareItemTypes();
  const { createCareItem } = useCatalogMutations();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const [form, setForm] = useState<CareItemForm>(() =>
    editingItem
      ? {
          id: editingItem.id,
          type_id: editingItem.type.id,
          name: editingItem.name,
          description: editingItem.description,
          status: editingItem.status,
        }
      : { ...CatalogUtils.blankCareItemForm(), type_id: defaultTypeId },
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = createFieldSetter(setForm, setErrors);

  useEffect(() => {
    if (!open) return;
    setForm(
      editingItem
        ? {
            id: editingItem.id,
            type_id: editingItem.type.id,
            name: editingItem.name,
            description: editingItem.description,
            status: editingItem.status,
          }
        : { ...CatalogUtils.blankCareItemForm(), type_id: defaultTypeId },
    );
    setErrors({});
  }, [open, editingItem, defaultTypeId]);

  function reset() {
    setForm({ ...CatalogUtils.blankCareItemForm(), type_id: defaultTypeId });
    setErrors({});
  }

  async function submit() {
    setSaving(true);
    try {
      await createCareItem(form, form.id || undefined);
      addToast({
        title: t("common.success"),
        message: t("catalog.itemsavedsuccess"),
        kind: "success",
      });
      onOpenChange(false);
      reset();
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("common.savefailedmessage"),
        kind: "danger",
      });
    } finally {
      setSaving(false);
    }
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
          <DialogTitle className="flex items-center gap-2">
            <NotebookText className="size-4 text-primary" />{" "}
            {editingItem ? t("catalog.editcareitem") : t("catalog.createcareitem")}
          </DialogTitle>
          <DialogDescription>{t("catalog.careitemdesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] w-full overflow-hidden px-1">
          <div className="grid gap-4 py-2">
            <SelectField
              label={t("common.type")}
              value={form.type_id}
              options={CatalogUtils.careItemTypesOptions(careItemTypes)}
              onChange={(value) => set("type_id", value)}
              error={errors.type_id}
            />

            <div className="grid gap-2">
              <Label htmlFor="item-name">{t("common.name")}</Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder={t("catalog.itemnameplaceholder")}
                aria-invalid={errors.name ? true : undefined}
              />
              {errors.name ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-description">{t("catalog.description")}</Label>
              <Textarea
                id="item-description"
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder={t("catalog.itemdescplaceholder")}
              />
            </div>

            <SelectField
              label={t("common.status")}
              value={form.status}
              options={CatalogConfig.STATUS_OPTIONS}
              onChange={(value) => set("status", value as CareStatus)}
              error={errors.status}
            />
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving
              ? t("meal.creating")
              : editingItem
                ? t("common.savchanges")
                : t("catalog.createitem")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

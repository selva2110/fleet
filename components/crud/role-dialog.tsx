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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/components/context/language-provider";
import { useNotifications } from "@/components/context/notification-provider";
import { CrudAction, Role, RoleForm, RolePermissions } from "@/lib/auth/types";
import { useRoleMutations } from "@/lib/auth/hooks";
import { Switch } from "../ui/switch";
import { AuthConfig } from "@/lib/auth/config";
import { AuthUtils } from "@/lib/auth/utils";

export function RoleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Role | null;
}) {
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const { createRole, updateRole } = useRoleMutations();
  const [form, setForm] = useState<RoleForm>(AuthUtils.emptyForm());
  const [saving, setSaving] = useState(false);

  const isEditing = !!editing;

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name ?? "",
              description: editing.description ?? "",
              status: editing.status,
              permissions: AuthUtils.buildEmptyPermissions(),
            }
          : AuthUtils.emptyForm(),
      );
    }
  }, [open, editing]);

  function setField<K extends keyof RoleForm>(field: K, value: RoleForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function togglePermission(
    pageKey: string,
    action: CrudAction,
    value: boolean,
  ) {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [pageKey]: { ...prev.permissions[pageKey], [action]: value },
      },
    }));
  }

  function toggleActionForAllPages(action: CrudAction, value: boolean) {
    setForm((prev) => ({
      ...prev,
      permissions: AuthConfig.PERMISSION_PAGES.reduce<RolePermissions>(
        (acc, page) => {
          acc[page.key] = { ...prev.permissions[page.key], [action]: value };
          return acc;
        },
        {},
      ),
    }));
  }

  const isValid = form.name.trim().length > 0;

  async function submit() {
    if (!isValid) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: isEditing ? form.status : true,
      };

      if (isEditing && editing) {
        await updateRole(editing.id, payload);
      } else {
        await createRole(payload);
      }

      addToast({
        title: t("common.success"),
        message: isEditing ? t("role.updatesuccess") : t("role.createsuccess"),
        kind: "success",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create role:", error);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("role.edit") : t("role.add")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("role.editdesc") : t("role.createdesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">{t("role.name")}</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder={t("role.nameplaceholder")}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-description">{t("role.description")}</Label>
            <Textarea
              id="role-description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder={t("role.descriptionplaceholder")}
              rows={3}
            />
          </div>
          {isEditing ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="role-status">{t("common.status")}</Label>
                <p className="text-xs text-muted-foreground">
                  {form.status ? t("common.active") : t("common.inactive")}
                </p>
              </div>
              <Switch
                id="role-status"
                checked={form.status}
                onCheckedChange={(checked) => setField("status", checked)}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>{t("role.permissions")}</Label>
            <div className="rounded-md border border-border">
              <ScrollArea className="h-64">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">
                        {t("role.page")}
                      </th>
                      {AuthConfig.CRUD_ACTIONS.map((action) => (
                        <th
                          key={action.key}
                          className="px-3 py-2 text-center font-medium"
                        >
                          <div className="flex items-center gap-1">
                            <Checkbox
                              aria-label={t(action.labelKey)}
                              checked={AuthConfig.PERMISSION_PAGES.every(
                                (page) =>
                                  form.permissions[page.key]?.[action.key],
                              )}
                              onCheckedChange={(checked) =>
                                toggleActionForAllPages(
                                  action.key,
                                  checked === true,
                                )
                              }
                            />
                            &nbsp;
                            <span>{t(action.labelKey)}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AuthConfig.PERMISSION_PAGES.map((page) => (
                      <tr
                        key={page.key}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2">{t(page.labelKey)}</td>
                        {AuthConfig.CRUD_ACTIONS.map((action) => (
                          <td
                            key={action.key}
                            className="px-3 py-2 text-center"
                          >
                            <Checkbox
                              aria-label={`${t(page.labelKey)} - ${t(action.labelKey)}`}
                              checked={
                                form.permissions[page.key]?.[action.key] ??
                                false
                              }
                              onCheckedChange={(checked) =>
                                togglePermission(
                                  page.key,
                                  action.key,
                                  checked === true,
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving || !isValid}>
            {saving
              ? t("common.saving")
              : isEditing
                ? t("role.savechanges")
                : t("role.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

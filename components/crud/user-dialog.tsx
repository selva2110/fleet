"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AddressField,
  SelectField,
  SwitchField,
  TextField,
} from "./form-fields";
import { validateSchema } from "../validation/zod-validation";
import { createUserFormSchema } from "../validation/user";
import { User, UserForm } from "@/lib/user/types";
import { UserUtils } from "@/lib/user/utils";
import { saveUser } from "@/app/actions/crud";
import { useTranslation } from "../context/language-provider";
import { createFieldSetter } from "../common";
import { useRoles } from "@/lib/auth/hooks";
import { useCenters } from "@/lib/events/hooks";
import { useNotifications } from "../context/notification-provider";

export function UserDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: User | null;
  onSaved: () => void | Promise<void>;
}) {
  const { roles } = useRoles();
  const { centers } = useCenters();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const UserFormSchema = useMemo(
    () => createUserFormSchema(t, Boolean(editing)),
    [t, editing],
  );
  const roleOptions = roles.map((item) => ({
    label: item.name,
    value: item.id.toString(),
  }));
  const centerOptions = centers.map((center) => ({
    label: center.name,
    value: center.id,
  }));
  const [form, setForm] = useState<UserForm>(
    UserUtils.blankUser(roleOptions[0]?.value ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = createFieldSetter(setForm, setErrors);

  useEffect(() => {
    if (editing) {
      const { id, roles, createdAt, updatedAt, ...rest } = editing;
      void id;
      void createdAt;
      void updatedAt;
      setForm({
        ...rest,
        roleIds: roles.map((r) => r.id),
        password: "",
        confirmPassword: "",
      });
    } else {
      setForm(UserUtils.blankUser(roleOptions[0]?.value ?? ""));
    }
    setErrors({});
  }, [editing, open]);

  function validate() {
    const isValid = validateSchema(UserFormSchema, form, setErrors);
    if (!isValid) {
      addToast({
        title: t("common.validationfailed"),
        message: t("common.fixhighlightedfields"),
        kind: "danger",
      });
    }
    return isValid;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveUser({
        ...form,
        id: editing?.id,
      });
      addToast({
        title: t("common.success"),
        message: editing ? t("user.updatedsuccess") : t("user.addedsuccess"),
        kind: "success",
      });
      onOpenChange(false);
      await onSaved();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("user.edit") : t("user.add")}</DialogTitle>
          <DialogDescription>{t("user.dialogdesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("common.fullname")}
                value={form.name}
                onChange={(v) => set("name", v)}
                required
                error={errors.name}
              />
              <TextField
                label={t("auth.email")}
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                required
                error={errors.email}
              />
            </div>
            <AddressField
              label={t("common.address")}
              value={form.address}
              onChange={(v) => set("address", v)}
              location={null}
              onLocationChange={(v) => {}}
              required
              error={errors.address}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("common.phone")}
                value={form.phone}
                onChange={(v) => set("phone", v)}
                error={errors.phone}
              />
              <TextField
                label={t("part.bloodgroup")}
                value={form.bloodGroup}
                onChange={(v) => set("bloodGroup", v)}
                error={errors.bloodGroup}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("common.emergencycontactname")}
                value={form.emergencyContactName}
                onChange={(v) => set("emergencyContactName", v)}
                error={errors.emergencyContactName}
              />
              <TextField
                label={t("common.emergencycontactphone")}
                value={form.emergencyContactPhone}
                onChange={(v) => set("emergencyContactPhone", v)}
                error={errors.emergencyContactPhone}
              />
            </div>
            <SelectField
              label={t("common.center")}
              value={form.centerId}
              options={centerOptions}
              onChange={(v) => set("centerId", v)}
              error={errors.centerId}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("auth.password")}
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder={editing ? t("user.passwordkeephint") : undefined}
                required={!editing}
                error={errors.password}
              />
              <TextField
                label={t("auth.confirmPassword")}
                type="password"
                value={form.confirmPassword}
                onChange={(v) => set("confirmPassword", v)}
                required={!editing}
                error={errors.confirmPassword}
              />
            </div>
            <SelectField
              label={t("user.role")}
              value={form.roleIds[0] !== undefined ? String(form.roleIds[0]) : ""}
              options={roleOptions}
              onChange={(v) => set("roleIds", v ? [Number(v)] : [])}
              required
              error={errors.roleIds}
            />
            <SwitchField
              label={form.status ? t("common.active") : t("common.inactive")}
              checked={form.status}
              onChange={(v) => set("status", v)}
            />
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving}>
            {saving
              ? t("common.saving")
              : editing
                ? t("common.savchanges")
                : t("user.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

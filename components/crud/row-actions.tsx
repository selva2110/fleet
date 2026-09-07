"use client";

import { useState } from "react";
import { CalendarDays, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "../common";
import { useTranslation } from "../context/language-provider";

export function RowActions({
  onEdit,
  onDelete,
  onPto,
  deleteTitle,
  deleteMessage,
  canDelete = true,
  deleteDisabledReason,
  variant = "icons",
}: {
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onPto?: () => void;
  deleteTitle: string;
  deleteMessage: string;
  canDelete?: boolean;
  deleteDisabledReason?: string;
  variant?: "icons" | "menu";
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const deleteLabel = canDelete
    ? t("common.delete")
    : (deleteDisabledReason ?? t("common.deleteunavailable"));

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {variant === "icons" ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.edit")}
              title={t("common.edit")}
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            {onPto ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("driver.ptorequests")}
                title={t("driver.ptorequests")}
                onClick={onPto}
              >
                <CalendarDays className="size-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={deleteLabel}
              title={deleteLabel}
              disabled={!canDelete}
              onClick={() => {
                if (canDelete) setConfirmOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.rowactions")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-3.5" /> {t("common.edit")}
              </DropdownMenuItem>
              {onPto ? (
                <DropdownMenuItem onClick={onPto}>
                  <CalendarDays className="size-3.5" />{" "}
                  {t("driver.ptorequests")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                disabled={!canDelete}
                onClick={() => {
                  if (canDelete) setConfirmOpen(true);
                }}
              >
                <Trash2 className="size-3.5" />
                {deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={deleteTitle}
        message={deleteMessage}
        onConfirm={confirmDelete}
        loading={deleting}
        confirmLabel={deleting ? t("common.deleting") : t("common.delete")}
      />
    </>
  );
}

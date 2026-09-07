"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "../common";
import { EmptyState } from "../data-view/data-view";
import { useTranslation } from "../context/language-provider";
import { DIET_OPTIONS, GroupRecord, MEAL_OPTIONS } from "@/lib/catalog/groups";
import { SelectField } from "../crud/form-fields";

export function GroupDetailDialog({
  open,
  onOpenChange,
  group,
  onEdit,
  onDelete,
  onUpdateMember,
  onRemoveMember,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: GroupRecord | null;
  onEdit: (group: GroupRecord) => void;
  onDelete: (group: GroupRecord) => void;
  onUpdateMember: (
    participantId: string,
    values: { mealType: string; dietType: string },
  ) => void;
  onRemoveMember: (participantId: string) => void;
}) {
  const { t } = useTranslation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
        <DialogTitle className="flex-1">{group.name}</DialogTitle>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline">{group.mealType}</Badge>
            <Badge variant="outline">{group.dietType}</Badge>
            <span className="text-xs text-muted-foreground">
              {group.members.length} {t("members")}
            </span>
          </div>
        </DialogHeader>

        {group.members.length === 0 ? (
          <EmptyState message={t("part.nomembersingroup")} />
        ) : (
          <ScrollArea className="max-h-[45vh]">
            <div className="flex flex-col gap-2 pr-2">
              {group.members.map((member) => {
                return (
                  <div
                    key={member.participantId}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{member.name}</p>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("part.removeparticipant")}
                        onClick={() => setRemoveMemberId(member.participantId)}
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <SelectField
                        label={t("part.mealtype")}
                        value={member.mealType}
                        options={MEAL_OPTIONS}
                        onChange={(value) =>
                          onUpdateMember(member.participantId, {
                            mealType: value,
                            dietType: member.dietType,
                          })
                        }
                      />
                      <SelectField
                        label={t("part.diettype")}
                        value={member.dietType}
                        options={DIET_OPTIONS}
                        onChange={(value) =>
                          onUpdateMember(member.participantId, {
                            mealType: member.mealType,
                            dietType: value,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter showCloseButton>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.edit")}
              onClick={() => onEdit(group)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.delete")}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t("common.delete")}
        message={`Are you sure you want to delete "${group.name}"?`}
        onConfirm={() => {
          onDelete(group);
          setConfirmDeleteOpen(false);
        }}
      />

      <ConfirmDialog
        open={removeMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null);
        }}
        title={t("part.removeparticipant")}
        message="Remove this participant from the group?"
        onConfirm={() => {
          if (!removeMemberId) return;
          onRemoveMember(removeMemberId);
          setRemoveMemberId(null);
        }}
      />
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  NotebookText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatusBadge } from "@/components/common";
import { CatalogConfig } from "@/lib/catalog/config";
import { CareItem, CareItemType, CareStatus } from "@/lib/catalog/types";
import { useCareItems, useCareItemTypes, useCatalogMutations } from "@/lib/catalog/hooks";
import { SelectField } from "@/components/crud/form-fields";
import { CatalogUtils } from "@/lib/catalog/utils";
import { useTranslation } from "@/components/context/language-provider";
import { EventsConfig } from "@/lib/events/config";
import { findById } from "@/lib/utils";

export default function CareCatalogPage() {
  const { careItems } = useCareItems();
  const { careItemTypes } = useCareItemTypes();
  const { createCareItem, deleteCareItem, createCareItemType, deleteCareItemType } =
    useCatalogMutations();
  const { t } = useTranslation();
  const [selectedTypeId, setSelectedTypeId] = useState(
    careItemTypes[0]?.id ?? "",
  );
  const [typeQuery, setTypeQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CareItemType | null>(null);
  const [editingItem, setEditingItem] = useState<CareItem | null>(null);
  const [typeForm, setTypeForm] = useState(
    CatalogUtils.blankCareItemTypeForm(),
  );
  const [itemForm, setItemForm] = useState(CatalogUtils.blankCareItemForm());

  const selectedType =
    findById(careItemTypes, selectedTypeId) ?? careItemTypes[0];

  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    return careItemTypes.filter((type) => {
      if (!q) return true;
      return (
        type.name.toLowerCase().includes(q) ||
        type.code.toLowerCase().includes(q) ||
        type.description.toLowerCase().includes(q)
      );
    });
  }, [typeQuery, careItemTypes]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!selectedType) return [];

    return careItems.filter((item) => {
      if (item.type.id !== selectedType.id) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [careItems, itemQuery, selectedType]);

  function openTypeDialog(type?: CareItemType) {
    if (type) {
      setEditingType(type);
      setTypeForm({
        code: type.code,
        name: type.name,
        description: type.description,
        status: type.status,
      });
    } else {
      setEditingType(null);
      setTypeForm(CatalogUtils.blankCareItemTypeForm());
    }
    setTypeDialogOpen(true);
  }

  function openItemDialog(item?: CareItem) {
    if (item) {
      setEditingItem(item);
      setItemForm({
        id: item.id,
        type_id: item.type.id,
        name: item.name,
        description: item.description,
        status: item.status,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        id: "",
        type_id: selectedTypeId,
        name: "",
        description: "",
        status: "ACTIVE",
      });
    }
    setItemDialogOpen(true);
  }

  async function saveType() {
    await createCareItemType(typeForm, editingType?.id);
    setTypeDialogOpen(false);
    setEditingType(null);
    setTypeForm(CatalogUtils.blankCareItemTypeForm());
  }

  async function saveItem() {
    await createCareItem(itemForm, itemForm.id);
    setItemDialogOpen(false);
    setEditingItem(null);
    setItemForm(CatalogUtils.blankCareItemForm());
  }

  async function deleteType(typeId: string) {
    await deleteCareItemType(typeId);
  }

  async function deleteItem(itemId: string) {
    await deleteCareItem(itemId);
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER["catalog"]?.title)}
        description={t(EventsConfig.EVENT_HEADER["catalog"]?.description)}
      />
      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="p-4 max-h-screen">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="size-4" /> {t("catalog.itemtypes")}{" "}
                <Button onClick={() => openTypeDialog()} size="sm">
                  <Plus className="size-4" /> {t("catalog.addtype")}
                </Button>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {careItemTypes.length}
              </span>
            </div>

            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={typeQuery}
                onChange={(event) => setTypeQuery(event.target.value)}
                placeholder={t("catalog.searchtypes")}
                className="pl-9"
              />
            </div>

            <div className="space-y-3 overflow-auto thin-scrollbar">
              {filteredTypes.map((type) => {
                const active = type.id === selectedType?.id;
                const meta = CatalogConfig.careStatusMeta[type.status];
                return (
                  <div
                    key={type.id}
                    className={[
                      "rounded-xl border p-3 transition-colors",
                      active
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTypeId(type.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {type.name}
                          </span>
                          <StatusBadge label={t(meta.label)} cls={meta.cls} />
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                          {type.code}
                        </p>
                      </button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openTypeDialog(type)}
                          aria-label={t("catalog.edittype")}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteType(type.id)}
                          aria-label={t("catalog.deletetype")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {type.description || t("catalog.nodescription")}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            {selectedType ? (
              <>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="size-5 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">
                        {selectedType.name}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedType.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={t(
                        CatalogConfig.careStatusMeta[selectedType.status].label
                      )}
                      cls={
                        CatalogConfig.careStatusMeta[selectedType.status].cls
                      }
                    />
                    <Button onClick={() => openItemDialog()} size="sm">
                      <Plus className="size-4" /> {t("catalog.additem")}
                    </Button>
                  </div>
                </div>

                <div className="relative mb-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={itemQuery}
                    onChange={(event) => setItemQuery(event.target.value)}
                    placeholder={t("catalog.searchitems")}
                    className="pl-9"
                  />
                </div>

                {filteredItems.length === 0 ? (
                  <div className="flex min-h-55 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                    {t("catalog.noitems")}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("catalog.item")}</TableHead>
                          <TableHead>{t("catalog.description")}</TableHead>
                          <TableHead>{t("common.status")}</TableHead>
                          <TableHead className="w-28 text-right">
                            {t("common.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const meta =
                            CatalogConfig.careStatusMeta[item.status];
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <NotebookText className="size-4 text-primary" />
                                  <span className="font-medium text-foreground">
                                    {item.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {item.description || t("catalog.nodescshort")}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={t(meta.label)}
                                  cls={meta.cls}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openItemDialog(item)}
                                    aria-label={t("catalog.edititem")}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => deleteItem(item.id)}
                                    aria-label={t("catalog.deleteitem")}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-55 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("catalog.selecttype")}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={typeDialogOpen}
        onOpenChange={(open) => {
          setTypeDialogOpen(open);
          if (!open) {
            setEditingType(null);
            setTypeForm(CatalogUtils.blankCareItemTypeForm());
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingType
                ? t("catalog.editcaretype")
                : t("catalog.createcaretype")}
            </DialogTitle>
            <DialogDescription>{t("catalog.caretypedesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="type-code">{t("common.code")}</Label>
              <Input
                id="type-code"
                value={typeForm.code}
                onChange={(event) =>
                  setTypeForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder={t("catalog.codeplaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type-name">{t("common.name")}</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(event) =>
                  setTypeForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t("catalog.typenameplaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type-description">
                {t("catalog.description")}
              </Label>
              <Textarea
                id="type-description"
                value={typeForm.description}
                onChange={(event) =>
                  setTypeForm((prev) => ({
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
              value={typeForm.status}
              options={CatalogConfig.STATUS_OPTIONS}
              onChange={(event) =>
                setTypeForm((prev) => ({
                  ...prev,
                  status: event as CareStatus,
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveType}>
              {editingType ? t("common.savchanges") : t("catalog.createtype")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setItemForm({
              id: "",
              type_id: selectedType?.id ?? careItemTypes[0]?.id ?? "",
              name: "",
              description: "",
              status: "ACTIVE",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("catalog.editcareitem")
                : t("catalog.createcareitem")}
            </DialogTitle>
            <DialogDescription>{t("catalog.careitemdesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="item-type">{t("common.type")}</Label>
              <SelectField
                label=""
                value={itemForm.type_id}
                options={CatalogUtils.careItemTypesOptions(careItemTypes)}
                onChange={(event) =>
                  setItemForm((prev) => ({
                    ...prev,
                    type_id: event as CareStatus,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-name">{t("common.name")}</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t("catalog.itemnameplaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-description">
                {t("catalog.description")}
              </Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder={t("catalog.itemdescplaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-status">{t("common.status")}</Label>
              <SelectField
                label=""
                value={itemForm.status}
                options={CatalogConfig.STATUS_OPTIONS}
                onChange={(event) =>
                  setItemForm((prev) => ({
                    ...prev,
                    status: event as CareStatus,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveItem}>
              {editingItem ? t("common.savchanges") : t("catalog.createitem")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

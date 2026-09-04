import { useCatalogMutations } from "@/lib/catalog/hooks";
import { CareItem, CareItemType } from "@/lib/catalog/types";
import { useTranslation } from "../context/language-provider";
import { useMemo, useState } from "react";
import {
  compareValues,
  DataToolbar,
  EmptyState,
  LoadingState,
  useDataView,
} from "../data-view/data-view";
import { findById } from "@/lib/utils";
import { Card } from "../ui/card";
import {
  FolderOpen,
  NotebookText,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CatalogConfig } from "@/lib/catalog/config";
import { StatusBadge } from "../common";
import { DEFAULT_CARE_TYPES } from "@/app/(app)/catalog/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { NewCareTypeDialog } from "./new-care-type-dialog";
import { NewCareItemDialog } from "./new-care-item-dialog";

export function CatalogTab({
  careItems,
  careItemTypes,
  isLoading = false,
}: {
  careItems: CareItem[];
  careItemTypes: CareItemType[];
  isLoading?: boolean;
}) {
  const { deleteCareItem, deleteCareItemType } = useCatalogMutations();
  const { t } = useTranslation();
  const [selectedTypeId, setSelectedTypeId] = useState(
    careItemTypes[0]?.id ?? "",
  );
  const [typeQuery, setTypeQuery] = useState("");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CareItemType | null>(null);
  const [editingItem, setEditingItem] = useState<CareItem | null>(null);
  const idv = useDataView("name", "list");

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
    const q = idv.query.trim().toLowerCase();
    if (!selectedType) return [];

    const list = careItems.filter((item) => {
      if (item.type.id !== selectedType.id) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) =>
      compareValues(
        a[idv.sortKey as keyof CareItem],
        b[idv.sortKey as keyof CareItem],
        idv.sortDir,
      ),
    );
    return list;
  }, [careItems, idv.query, idv.sortKey, idv.sortDir, selectedType]);

  function openTypeDialog(type?: CareItemType) {
    setEditingType(type ?? null);
    setTypeDialogOpen(true);
  }

  function openItemDialog(item?: CareItem) {
    setEditingItem(item ?? null);
    setItemDialogOpen(true);
  }

  async function deleteType(typeId: string) {
    await deleteCareItemType(typeId);
  }

  async function deleteItem(itemId: string) {
    await deleteCareItem(itemId);
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
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
                        title="Edit Care Item"
                        onClick={() => openTypeDialog(type)}
                        aria-label={t("catalog.edittype")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {DEFAULT_CARE_TYPES.includes(String(type.id)) ? null : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete Care Item"
                          onClick={() => deleteType(type.id)}
                          aria-label={t("catalog.deletetype")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
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
                      CatalogConfig.careStatusMeta[selectedType.status].label,
                    )}
                    cls={CatalogConfig.careStatusMeta[selectedType.status].cls}
                  />
                  <Button onClick={() => openItemDialog()} size="sm">
                    <Plus className="size-4" /> {t("catalog.additem")}
                  </Button>
                </div>
              </div>

              <DataToolbar
                query={idv.query}
                onQueryChange={idv.setQuery}
                searchPlaceholder={t("catalog.searchitems")}
                sortOptions={CatalogConfig.ITEM_SORT_OPTIONS}
                sortKey={idv.sortKey}
                onSortKeyChange={idv.setSortKey}
                sortDir={idv.sortDir}
                onToggleSortDir={idv.toggleSortDir}
                view={idv.view}
                onViewChange={idv.setView}
                resultCount={filteredItems.length}
              />

              {filteredItems.length === 0 ? (
                <EmptyState message={t("catalog.noitems")} />
              ) : idv.view === "grid" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => {
                    const meta = CatalogConfig.careStatusMeta[item.status];
                    return (
                      <Card key={item.id} className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <NotebookText className="size-4 shrink-0 text-primary" />
                            <span className="truncate text-sm font-semibold">
                              {item.name}
                            </span>
                          </div>
                          <StatusBadge label={t(meta.label)} cls={meta.cls} />
                        </div>
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {item.description || t("catalog.nodescshort")}
                        </p>
                        <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
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
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
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
                        const meta = CatalogConfig.careStatusMeta[item.status];
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

      <NewCareTypeDialog
        open={typeDialogOpen}
        onOpenChange={(open) => {
          setTypeDialogOpen(open);
          if (!open) setEditingType(null);
        }}
        editingType={editingType}
      />

      <NewCareItemDialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        editingItem={editingItem}
        defaultTypeId={selectedType?.id ?? careItemTypes[0]?.id ?? ""}
      />
    </>
  );
}

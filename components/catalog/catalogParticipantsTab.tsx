import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useTranslation } from "../context/language-provider";
import {
  compareValues,
  DataToolbar,
  EmptyState,
  LoadingState,
  SortOption,
  useDataView,
} from "../data-view/data-view";
import { useState, useMemo } from "react";
import { MapPin, Pencil, Phone } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { useParticipantReports } from "@/lib/participant/hooks";
import { ParticipantMedMealReportItem } from "@/lib/participant/types";
import { EditParticipantReportDialog } from "./edit-participant-report-dialog";
import { CatalogParticipantColumnKey } from "@/lib/catalog/types";
import { CatalogConfig } from "@/lib/catalog/config";

const REPORT_SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "common.name" },
];

export default function CatalogParticipantsTab({
  selectedParticipantIds,
  onSelectedParticipantIdsChange,
  columns = CatalogConfig.DEFAULT_COLUMNS,
  typeId,
}: {
  selectedParticipantIds: string[];
  onSelectedParticipantIdsChange: (ids: string[]) => void;
  columns?: CatalogParticipantColumnKey[];
  typeId?: number;
}) {
  const { t } = useTranslation();
  const pdv = useDataView("name", "list");
  const { reports, isLoading } = useParticipantReports();
  const visibleColumns = useMemo(() => new Set(columns), [columns]);
  const showColumn = (key: CatalogParticipantColumnKey) =>
    visibleColumns.has(key);
  const getLastDeliveryDate = (r: ParticipantMedMealReportItem) =>
    r.deliveryDetails.find((d) => d.typeId === typeId)?.lastDeliveryDate ??
    "";
  const [editingReport, setEditingReport] =
    useState<ParticipantMedMealReportItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  function openEdit(report: ParticipantMedMealReportItem) {
    setEditingReport(report);
    setEditDialogOpen(true);
  }

  const filteredReports = useMemo(() => {
    const q = pdv.query.trim().toLowerCase();
    const list = reports.filter((r) => {
      return (
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.address?.toLowerCase().includes(q) ?? false) ||
        (r.phone?.toLowerCase().includes(q) ?? false)
      );
    });
    list.sort((a, b) =>
      compareValues(
        a[pdv.sortKey as keyof ParticipantMedMealReportItem],
        b[pdv.sortKey as keyof ParticipantMedMealReportItem],
        pdv.sortDir,
      ),
    );
    return list;
  }, [reports, pdv.query, pdv.sortKey, pdv.sortDir]);

  const allSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) =>
      selectedParticipantIds.includes(r.participantId),
    );

  function toggleSelected(id: string, checked: boolean) {
    onSelectedParticipantIdsChange(
      checked
        ? [...selectedParticipantIds, id]
        : selectedParticipantIds.filter((pid) => pid !== id),
    );
  }

  function toggleAllSelected(checked: boolean) {
    const filteredIds = filteredReports.map((r) => r.participantId);
    onSelectedParticipantIdsChange(
      checked
        ? Array.from(new Set([...selectedParticipantIds, ...filteredIds]))
        : selectedParticipantIds.filter((id) => !filteredIds.includes(id)),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DataToolbar
        query={pdv.query}
        onQueryChange={pdv.setQuery}
        searchPlaceholder={t("part.searchplaceholder")}
        sortOptions={REPORT_SORT_OPTIONS}
        sortKey={pdv.sortKey}
        onSortKeyChange={pdv.setSortKey}
        sortDir={pdv.sortDir}
        onToggleSortDir={pdv.toggleSortDir}
        view={pdv.view}
        onViewChange={pdv.setView}
        resultCount={filteredReports.length}
      />

      {isLoading ? (
        <LoadingState />
      ) : filteredReports.length === 0 ? (
        <EmptyState message={t("part.none")} />
      ) : pdv.view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((r) => (
            <Card key={r.participantId} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                {showColumn("participant") && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" /> {r.address}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3 shrink-0" /> {r.phone}
                    </p>
                  </div>
                )}
                {showColumn("select") && (
                  <Checkbox
                    checked={selectedParticipantIds.includes(r.participantId)}
                    onCheckedChange={(v) =>
                      toggleSelected(r.participantId, v === true)
                    }
                    aria-label={r.name}
                  />
                )}
              </div>
              {(showColumn("dietPlan") ||
                showColumn("mealNotes") ||
                showColumn("medicalNotes") ||
                showColumn("lastDeliveryDate")) && (
                <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  {showColumn("dietPlan") && (
                    <p>
                      <span className="font-medium text-foreground">
                        {t("part.dietplan")}:
                      </span>{" "}
                      {r.dietPlan || "—"}
                    </p>
                  )}
                  {showColumn("mealNotes") && (
                    <p>
                      <span className="font-medium text-foreground">
                        {t("part.mealnotes")}:
                      </span>{" "}
                      {r.mealNotes || "—"}
                    </p>
                  )}
                  {showColumn("medicalNotes") && (
                    <p>
                      <span className="font-medium text-foreground">
                        {t("part.medicalNotes")}:
                      </span>{" "}
                      {r.medicalNotes || "—"}
                    </p>
                  )}
                  {showColumn("lastDeliveryDate") && (
                    <p>
                      <span className="font-medium text-foreground">
                        {t("part.lastdeliverydate")}:
                      </span>{" "}
                      {getLastDeliveryDate(r) || "—"}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-end border-t border-border pt-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(r)}
                  aria-label={t("common.edit")}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showColumn("select") && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAllSelected(v === true)}
                        aria-label={t("common.selectall")}
                      />
                    </TableHead>
                  )}
                  {showColumn("participant") && (
                    <TableHead>{t("common.participant")}</TableHead>
                  )}
                  {showColumn("dietPlan") && (
                    <TableHead>{t("part.dietplan")}</TableHead>
                  )}
                  {showColumn("mealNotes") && (
                    <TableHead>{t("part.mealnotes")}</TableHead>
                  )}
                  {showColumn("medicalNotes") && (
                    <TableHead>{t("part.medicalNotes")}</TableHead>
                  )}
                  {showColumn("lastDeliveryDate") && (
                    <TableHead>{t("part.lastdeliverydate")}</TableHead>
                  )}
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((r) => (
                  <TableRow key={r.participantId}>
                    {showColumn("select") && (
                      <TableCell>
                        <Checkbox
                          checked={selectedParticipantIds.includes(
                            r.participantId,
                          )}
                          onCheckedChange={(v) =>
                            toggleSelected(r.participantId, v === true)
                          }
                          aria-label={r.name}
                        />
                      </TableCell>
                    )}
                    {showColumn("participant") && (
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.address
                            ? r.address.length > 50
                              ? `${r.address.slice(0, 50)}...`
                              : r.address
                            : t("common.noaddressavail")}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone className="size-3" /> {r.phone}
                        </p>
                      </TableCell>
                    )}
                    {showColumn("dietPlan") && (
                      <TableCell>
                        <p className="text-sm">{r.dietPlan || "—"}</p>
                      </TableCell>
                    )}
                    {showColumn("mealNotes") && (
                      <TableCell>
                        <p className="text-sm">{r.mealNotes || "—"}</p>
                      </TableCell>
                    )}
                    {showColumn("medicalNotes") && (
                      <TableCell>
                        <p className="text-sm">{r.medicalNotes || "—"}</p>
                      </TableCell>
                    )}
                    {showColumn("lastDeliveryDate") && (
                      <TableCell>
                        <p className="text-sm">
                          {getLastDeliveryDate(r) || "—"}
                        </p>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(r)}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <EditParticipantReportDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingReport(null);
        }}
        report={editingReport}
        columns={columns}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MapPin, Pencil, Plus, UserX } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, ConfirmDialog } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  LoadingState,
  Pagination,
  usePagination,
} from "@/components/data-view/data-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParticipantStore } from "@/lib/participant-crud/store";
import type { Participant } from "@/lib/participant-crud/types";
import {
  ENROLLED_TONE,
  GENDER_LABEL,
  NEUTRAL_TONE,
  RISK_TONE,
  fullName,
  statusTone,
} from "@/lib/participant-crud/config";
import {
  CITIES,
  LANGUAGES,
  RESIDENCE_TYPES,
  STATES,
} from "@/lib/participant-crud/mock-data";
import { formatMonthDayYear } from "@/lib/date";

const YES_NO = [
  { value: "", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

interface Filters {
  status: string;
  gender: string;
  enrollment: string;
  profileCompleted: string;
  profileVerified: string;
  highRisk: string;
  residenceType: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  country: string;
  state: string;
  city: string;
}

const EMPTY_FILTERS: Filters = {
  status: "",
  gender: "",
  enrollment: "",
  profileCompleted: "",
  profileVerified: "",
  highRisk: "",
  residenceType: "",
  primaryLanguage: "",
  secondaryLanguage: "",
  country: "",
  state: "",
  city: "",
};

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="h-8 w-full">
        <SelectValue>{() => selected?.label ?? "Any"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "any"} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function matchesQuery(p: Participant, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [
    p.firstName,
    p.middleName,
    p.lastName,
    p.preferredName,
    p.email,
    p.phoneNumber,
    p.mrnNumber,
    p.userId != null ? String(p.userId) : "",
  ]
    .filter(Boolean)
    .some((v) => v.toLowerCase().includes(needle));
}

export default function ParticipantsPage() {
  const { participants, isLoading, error, deactivate } = useParticipantStore();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [toDeactivate, setToDeactivate] = useState<Participant | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      if (!matchesQuery(p, query)) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.enrollment) {
        const enrolled = filters.enrollment === "enrolled";
        if (p.enrollmentStatus !== enrolled) return false;
      }
      if (filters.profileCompleted) {
        if (p.isProfileCompleted !== (filters.profileCompleted === "yes"))
          return false;
      }
      if (filters.profileVerified) {
        if (p.isProfileVerified !== (filters.profileVerified === "yes"))
          return false;
      }
      if (filters.highRisk) {
        if (p.highRisk !== (filters.highRisk === "yes")) return false;
      }
      if (filters.residenceType && p.residenceType !== filters.residenceType)
        return false;
      if (filters.primaryLanguage && p.primaryLanguage !== filters.primaryLanguage)
        return false;
      if (
        filters.secondaryLanguage &&
        p.secondaryLanguage !== filters.secondaryLanguage
      )
        return false;
      if (filters.country && p.country !== filters.country) return false;
      if (filters.state && p.state !== filters.state) return false;
      if (filters.city && p.city !== filters.city) return false;
      return true;
    });
  }, [participants, query, filters]);

  const pg = usePagination(filtered, 20);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const stats = useMemo(() => {
    const active = participants.filter((p) => p.status === "ACTIVE").length;
    const enrolled = participants.filter((p) => p.enrollmentStatus).length;
    const highRisk = participants.filter((p) => p.highRisk).length;
    return { total: participants.length, active, enrolled, highRisk };
  }, [participants]);

  async function confirmDeactivate() {
    if (!toDeactivate) return;
    setDeactivating(true);
    try {
      await deactivate(toDeactivate.id);
      setToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Participants"
        description="Manage participant profiles and information"
        actions={
          <Button
            size="sm"
            render={<Link href="/participants/create" />}
          >
            <Plus className="size-4" /> Add Participant
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Participants" value={stats.total} />
          <StatCard label="Active" value={stats.active} tone="success" />
          <StatCard label="Enrolled" value={stats.enrolled} />
          <StatCard label="High Risk" value={stats.highRisk} tone="danger" />
        </div>

        <ListLayout
          filters={
            <FilterRail
              activeCount={activeFilterCount}
              onReset={() => setFilters(EMPTY_FILTERS)}
            >
              <FilterSection title="Status">
                <FilterSelect
                  value={filters.status}
                  onChange={(v) => setFilter("status", v)}
                  options={[
                    { value: "", label: "Any" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ]}
                />
              </FilterSection>
              <FilterSection title="Gender" defaultOpen={false}>
                <FilterSelect
                  value={filters.gender}
                  onChange={(v) => setFilter("gender", v)}
                  options={[
                    { value: "", label: "Any" },
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                    { value: "OTHER", label: "Other" },
                    { value: "UNKNOWN", label: "Prefer not to say" },
                  ]}
                />
              </FilterSection>
              <FilterSection title="Enrollment" defaultOpen={false}>
                <FilterSelect
                  value={filters.enrollment}
                  onChange={(v) => setFilter("enrollment", v)}
                  options={[
                    { value: "", label: "Any" },
                    { value: "enrolled", label: "Enrolled" },
                    { value: "not-enrolled", label: "Not Enrolled" },
                  ]}
                />
              </FilterSection>
              <FilterSection title="Profile Completed" defaultOpen={false}>
                <FilterSelect
                  value={filters.profileCompleted}
                  onChange={(v) => setFilter("profileCompleted", v)}
                  options={YES_NO}
                />
              </FilterSection>
              <FilterSection title="Profile Verified" defaultOpen={false}>
                <FilterSelect
                  value={filters.profileVerified}
                  onChange={(v) => setFilter("profileVerified", v)}
                  options={YES_NO}
                />
              </FilterSection>
              <FilterSection title="High Risk" defaultOpen={false}>
                <FilterSelect
                  value={filters.highRisk}
                  onChange={(v) => setFilter("highRisk", v)}
                  options={YES_NO}
                />
              </FilterSection>
              <FilterSection title="Residence Type" defaultOpen={false}>
                <FilterSelect
                  value={filters.residenceType}
                  onChange={(v) => setFilter("residenceType", v)}
                  options={[
                    { value: "", label: "Any" },
                    ...RESIDENCE_TYPES.map((r) => ({ value: r, label: r })),
                  ]}
                />
              </FilterSection>
              <FilterSection title="Primary Language" defaultOpen={false}>
                <FilterSelect
                  value={filters.primaryLanguage}
                  onChange={(v) => setFilter("primaryLanguage", v)}
                  options={[
                    { value: "", label: "Any" },
                    ...LANGUAGES.map((l) => ({ value: l, label: l })),
                  ]}
                />
              </FilterSection>
              <FilterSection title="Secondary Language" defaultOpen={false}>
                <FilterSelect
                  value={filters.secondaryLanguage}
                  onChange={(v) => setFilter("secondaryLanguage", v)}
                  options={[
                    { value: "", label: "Any" },
                    ...LANGUAGES.map((l) => ({ value: l, label: l })),
                  ]}
                />
              </FilterSection>
              <FilterSection title="Country" defaultOpen={false}>
                <FilterSelect
                  value={filters.country}
                  onChange={(v) => setFilter("country", v)}
                  options={[
                    { value: "", label: "Any" },
                    { value: "United States", label: "United States" },
                  ]}
                />
              </FilterSection>
              <FilterSection title="State" defaultOpen={false}>
                <FilterSelect
                  value={filters.state}
                  onChange={(v) => setFilter("state", v)}
                  options={[
                    { value: "", label: "Any" },
                    ...STATES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </FilterSection>
              <FilterSection title="City" defaultOpen={false}>
                <FilterSelect
                  value={filters.city}
                  onChange={(v) => setFilter("city", v)}
                  options={[
                    { value: "", label: "Any" },
                    ...CITIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone, MRN, or user ID..."
                className="max-w-md"
              />
            </div>

            {error ? (
              <EmptyState message={error} />
            ) : isLoading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState message="No participants match your search or filters." />
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>MRN</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Date of Birth</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Enrollment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.pageItems.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link
                              href={`/participants/${p.id}`}
                              className="font-medium hover:underline"
                            >
                              {fullName(p)}
                            </Link>
                            {p.preferredName ? (
                              <p className="text-xs text-muted-foreground">
                                &ldquo;{p.preferredName}&rdquo;
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {p.mrnNumber || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.countryCode} {p.phoneNumber}
                          </TableCell>
                          <TableCell className="max-w-44 truncate text-sm text-muted-foreground">
                            {p.email || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {GENDER_LABEL[p.gender] ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {p.dob ? formatMonthDayYear(p.dob) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" />
                              {p.city || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              label={p.enrollmentStatus ? "Enrolled" : "Not Enrolled"}
                              cls={p.enrollmentStatus ? ENROLLED_TONE : NEUTRAL_TONE}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge
                                label={p.status === "ACTIVE" ? "Active" : "Inactive"}
                                cls={statusTone(p.status)}
                              />
                              {p.highRisk ? (
                                <StatusBadge label="High Risk" cls={RISK_TONE} />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`View ${fullName(p)}`}
                                render={<Link href={`/participants/${p.id}`} />}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Edit ${fullName(p)}`}
                                render={<Link href={`/participants/${p.id}/edit`} />}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                aria-label={`Deactivate ${fullName(p)}`}
                                disabled={p.status === "INACTIVE"}
                                onClick={() => setToDeactivate(p)}
                              >
                                <UserX className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {filtered.length > 0 ? (
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                pageSize={pg.pageSize}
                onPageChange={pg.setPage}
                onPageSizeChange={pg.setPageSize}
                rangeStart={pg.rangeStart}
                rangeEnd={pg.rangeEnd}
                total={pg.total}
                itemLabel="participants"
              />
            ) : null}
          </div>
        </ListLayout>
      </div>

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null);
        }}
        title="Deactivate Participant?"
        message={
          toDeactivate
            ? `${fullName(toDeactivate)} will no longer be shown as an active participant.`
            : ""
        }
        onConfirm={confirmDeactivate}
        confirmLabel={deactivating ? "Deactivating..." : "Deactivate"}
        loading={deactivating}
      />
    </div>
  );
}

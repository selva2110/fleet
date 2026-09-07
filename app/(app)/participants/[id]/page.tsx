"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  UserX,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { PageHeader, StatusBadge, ConfirmDialog } from "@/components/common";
import { LoadingState } from "@/components/data-view/data-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaskedValue } from "@/components/participant-crud/masked-value";
import { useParticipantStore } from "@/lib/participant-crud/store";
import {
  ENROLLED_TONE,
  GENDER_LABEL,
  NEUTRAL_TONE,
  RISK_TONE,
  fullName,
  statusTone,
} from "@/lib/participant-crud/config";
import {
  AGENCIES,
  CAREGIVERS,
  GROUPS,
  LOCATIONS,
  ORGANIZATIONS,
  ROLES,
  SERVICES,
} from "@/lib/participant-crud/mock-data";
import type { LookupOption } from "@/lib/participant-crud/types";
import { getEmergencyContact } from "@/lib/participant-crud/types";
import { formatMonthDayYear } from "@/lib/date";

function names(ids: number[], table: LookupOption[]): string {
  const found = ids
    .map((id) => table.find((t) => t.id === id)?.name)
    .filter(Boolean);
  return found.length ? found.join(", ") : "—";
}

function name(id: number | null, table: LookupOption[]): string {
  if (id == null) return "—";
  return table.find((t) => t.id === id)?.name ?? "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">{children}</dl>
    </Card>
  );
}

export default function ParticipantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, isLoading, deactivate } = useParticipantStore();
  const p = getById(id);

  const [confirming, setConfirming] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const ec1 = useMemo(() => (p ? getEmergencyContact(p, 1) : null), [p]);
  const ec2 = useMemo(() => (p ? getEmergencyContact(p, 2) : null), [p]);

  if (isLoading && !p) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <p className="text-sm text-muted-foreground">Participant not found.</p>
        <Button variant="outline" render={<Link href="/participants" />}>
          <ArrowLeft className="size-4" /> Back to Participants
        </Button>
      </div>
    );
  }

  async function confirmDeactivate() {
    if (!p) return;
    setDeactivating(true);
    try {
      await deactivate(p.id);
      setConfirming(false);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={fullName(p)}
        description={`MRN ${p.mrnNumber || "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/participants" />}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/participants/${p.id}/edit`} />}
            >
              <Pencil className="size-4" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={p.status === "INACTIVE"}
              onClick={() => setConfirming(true)}
            >
              <UserX className="size-4" /> Deactivate
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5 p-6">
        {/* Summary strip */}
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {p.firstName.charAt(0)}
              {p.lastName.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {fullName(p)}
                {p.preferredName ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    &ldquo;{p.preferredName}&rdquo;
                  </span>
                ) : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" /> {p.countryCode} {p.phoneNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {p.email || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {p.city}, {p.state}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={p.status === "ACTIVE" ? "Active" : "Inactive"}
              cls={statusTone(p.status)}
            />
            <StatusBadge
              label={p.enrollmentStatus ? "Enrolled" : "Not Enrolled"}
              cls={p.enrollmentStatus ? ENROLLED_TONE : NEUTRAL_TONE}
            />
            {p.highRisk ? (
              <StatusBadge label="High Risk" cls={RISK_TONE} />
            ) : null}
          </div>
        </Card>

        {p.highRisk && p.notes ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{p.notes}</span>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <DetailCard title="Personal Information">
            <InfoRow label="First Name" value={p.firstName} />
            <InfoRow label="Middle Name" value={p.middleName} />
            <InfoRow label="Last Name" value={p.lastName} />
            <InfoRow label="Preferred Name" value={p.preferredName} />
            <InfoRow label="Gender" value={GENDER_LABEL[p.gender] ?? "—"} />
            <InfoRow
              label="Date of Birth"
              value={p.dob ? formatMonthDayYear(p.dob) : "—"}
            />
            <InfoRow label="Marital Status" value={p.martialStatus} />
            <InfoRow label="Primary Language" value={p.primaryLanguage} />
            <InfoRow label="Secondary Language" value={p.secondaryLanguage} />
          </DetailCard>

          <DetailCard title="Contact Information">
            <InfoRow
              label="Mobile Phone"
              value={`${p.countryCode} ${p.phoneNumber}`}
            />
            <InfoRow
              label="Home Phone"
              value={p.homePhoneNumber ? `${p.homeCountryCode} ${p.homePhoneNumber}` : "—"}
            />
            <InfoRow
              label="Work Phone"
              value={p.workPhoneNumber ? `${p.workCountryCode} ${p.workPhoneNumber}` : "—"}
            />
            <InfoRow label="Email" value={p.email} />
          </DetailCard>

          <DetailCard title="Present Address">
            <InfoRow label="Street" value={p.presentAddress.streetName} />
            <InfoRow label="City" value={p.presentAddress.city} />
            <InfoRow label="State" value={p.presentAddress.state} />
            <InfoRow label="ZIP" value={p.presentAddress.zip} />
          </DetailCard>

          <DetailCard title="Permanent Address">
            <InfoRow label="Street" value={p.permanentAddress.streetName} />
            <InfoRow label="City" value={p.permanentAddress.city} />
            <InfoRow label="State" value={p.permanentAddress.state} />
            <InfoRow label="ZIP" value={p.permanentAddress.zip} />
          </DetailCard>

          <DetailCard title="Organization & Enrollment">
            <InfoRow label="Organization" value={name(p.organizationId, ORGANIZATIONS)} />
            <InfoRow label="Agency" value={name(p.agencyId, AGENCIES)} />
            <InfoRow label="Group" value={name(p.groupId, GROUPS)} />
            <InfoRow label="Role" value={name(p.roleId, ROLES)} />
            <InfoRow label="MRN Number" value={p.mrnNumber} />
            <InfoRow label="Residence Type" value={p.residenceType} />
            <InfoRow label="Locations" value={names(p.locationId, LOCATIONS)} />
            <InfoRow label="Centers" value={names(p.center, LOCATIONS)} />
            <InfoRow label="Services" value={names(p.services, SERVICES)} />
          </DetailCard>

          <DetailCard title="Care Preferences">
            <InfoRow
              label="Preferred Caregivers"
              value={names(p.preferredCaregiverId, CAREGIVERS)}
            />
            <InfoRow
              label="Not Preferred Caregivers"
              value={names(p.notPreferredCaregiverId, CAREGIVERS)}
            />
            <InfoRow
              label="Orientation Caregiver"
              value={name(p.orientCaregiverId, CAREGIVERS)}
            />
            <InfoRow label="Relationship" value={p.relationship} />
          </DetailCard>

          {ec1 ? (
            <DetailCard title="Emergency Contact 1">
              <InfoRow
                label="Name"
                value={[ec1.firstName, ec1.middleName, ec1.lastName].filter(Boolean).join(" ")}
              />
              <InfoRow label="Relationship" value={ec1.relationship} />
              <InfoRow label="HCA Type" value={ec1.hcaType} />
              <InfoRow label="Email" value={ec1.email} />
              <InfoRow
                label="Mobile Phone"
                value={ec1.phone ? `${ec1.countryCode} ${ec1.phone}` : "—"}
              />
              <InfoRow label="Instructions" value={ec1.instructions} />
            </DetailCard>
          ) : null}

          {ec2 && ec2.firstName ? (
            <DetailCard title="Emergency Contact 2">
              <InfoRow
                label="Name"
                value={[ec2.firstName, ec2.middleName, ec2.lastName].filter(Boolean).join(" ")}
              />
              <InfoRow label="Relationship" value={ec2.relationship} />
              <InfoRow label="HCA Type" value={ec2.hcaType} />
              <InfoRow label="Email" value={ec2.email} />
              <InfoRow
                label="Mobile Phone"
                value={ec2.phone ? `${ec2.countryCode} ${ec2.phone}` : "—"}
              />
              <InfoRow label="Instructions" value={ec2.instructions} />
            </DetailCard>
          ) : null}
        </div>

        {p.careCircle.length > 0 ? (
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Care Circle</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.careCircle.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {[m.firstName, m.middleName, m.lastName].filter(Boolean).join(" ")}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.relationship}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.phone ? `${m.countryCode} ${m.phone}` : ""}
                    {m.email ? ` · ${m.email}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <DetailCard title="Additional Information">
          <InfoRow label="Home Instruction" value={p.homeInstruction} />
          <InfoRow label="Notes" value={p.notes} />
          <InfoRow
            label="Social Security"
            value={<MaskedValue value={p.socialSecurity} />}
          />
          <InfoRow label="Lockbox Code" value={p.LockboxCode ? "Enabled" : "Disabled"} />
          <InfoRow label="Profile Completed" value={p.isProfileCompleted ? "Yes" : "No"} />
          <InfoRow label="Profile Verified" value={p.isProfileVerified ? "Yes" : "No"} />
          <InfoRow label="User ID" value={p.userId != null ? String(p.userId) : "—"} />
          <InfoRow
            label="Date Added"
            value={p.createdAt ? formatMonthDayYear(p.createdAt) : "—"}
          />
        </DetailCard>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Deactivate Participant?"
        message={`${fullName(p)} will no longer be shown as an active participant.`}
        onConfirm={confirmDeactivate}
        confirmLabel={deactivating ? "Deactivating..." : "Deactivate"}
        loading={deactivating}
      />
    </div>
  );
}

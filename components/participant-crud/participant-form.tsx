"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextField, SelectField, SwitchField } from "@/components/crud/form-fields";
import { CareCircleEditor } from "./care-circle-editor";
import type {
  EmergencyContact,
  LookupOption,
  ParticipantInput,
} from "@/lib/participant-crud/types";
import { getEmergencyContact, applyEmergencyContact } from "@/lib/participant-crud/types";
import {
  COUNTRY_OPTIONS,
  CITY_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  MARITAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_OPTIONS,
  STATE_OPTIONS,
  STATUS_OPTIONS,
  validateParticipant,
  type ParticipantErrors,
} from "@/lib/participant-crud/config";
import {
  AGENCIES,
  CAREGIVERS,
  GROUPS,
  HCA_TYPES,
  LOCATIONS,
  ORGANIZATIONS,
  ROLES,
  SERVICES,
} from "@/lib/participant-crud/mock-data";

// -------------------------------------------------------------------------
// Small helpers
// -------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

/** Multi-select chip toggle for lookup arrays (services, locations, caregivers). */
function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: LookupOption[];
  value: number[];
  onChange: (v: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Single-select over a numeric lookup (maps number|null <-> string). */
function LookupSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: LookupOption[];
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const opts = useMemo(
    () => [
      { value: "", label: placeholder ?? "Select" },
      ...options.map((o) => ({ value: String(o.id), label: o.name })),
    ],
    [options, placeholder],
  );
  return (
    <SelectField
      label={label}
      value={value == null ? "" : String(value)}
      options={opts}
      onChange={(v) => onChange(v ? Number(v) : null)}
    />
  );
}

const COUNTRY_CODE_OPTIONS = ["+1", "+52", "+44", "+91", "+63"].map((c) => ({
  value: c,
  label: c,
}));

function PhoneField({
  label,
  code,
  phone,
  onCodeChange,
  onPhoneChange,
  error,
}: {
  label: string;
  code: string;
  phone: string;
  onCodeChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex gap-2">
        <div className="w-20 shrink-0">
          <SelectField
            label=""
            value={code}
            options={COUNTRY_CODE_OPTIONS}
            onChange={onCodeChange}
          />
        </div>
        <input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Phone number"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </Field>
  );
}

function EmergencyContactSection({
  index,
  contact,
  onChange,
}: {
  index: 1 | 2;
  contact: EmergencyContact;
  onChange: (ec: EmergencyContact) => void;
}) {
  function set<K extends keyof EmergencyContact>(key: K, val: EmergencyContact[K]) {
    onChange({ ...contact, [key]: val });
  }
  const hcaOptions = [
    { value: "", label: "Select type" },
    ...HCA_TYPES.map((h) => ({ value: h, label: h })),
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextField
        label="First Name"
        value={contact.firstName}
        onChange={(v) => set("firstName", v)}
      />
      <TextField
        label="Middle Name"
        value={contact.middleName}
        onChange={(v) => set("middleName", v)}
      />
      <TextField
        label="Last Name"
        value={contact.lastName}
        onChange={(v) => set("lastName", v)}
      />
      <SelectField
        label="Relationship"
        value={contact.relationship}
        options={RELATIONSHIP_OPTIONS}
        onChange={(v) => set("relationship", v)}
      />
      <TextField
        label="Email"
        type="email"
        value={contact.email}
        onChange={(v) => set("email", v)}
      />
      <SelectField
        label="HCA Type"
        value={contact.hcaType}
        options={hcaOptions}
        onChange={(v) => set("hcaType", v)}
      />
      <PhoneField
        label="Mobile Phone"
        code={contact.countryCode}
        phone={contact.phone}
        onCodeChange={(v) => set("countryCode", v)}
        onPhoneChange={(v) => set("phone", v)}
      />
      <PhoneField
        label="Home Phone"
        code={contact.homeCountryCode}
        phone={contact.homePhone}
        onCodeChange={(v) => set("homeCountryCode", v)}
        onPhoneChange={(v) => set("homePhone", v)}
      />
      <PhoneField
        label="Work Phone"
        code={contact.workCountryCode}
        phone={contact.workPhone}
        onCodeChange={(v) => set("workCountryCode", v)}
        onPhoneChange={(v) => set("workPhone", v)}
      />
      <div className="sm:col-span-2 lg:col-span-3">
        <TextField
          label="Instructions"
          value={contact.instructions}
          onChange={(v) => set("instructions", v)}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main form
// -------------------------------------------------------------------------

export function ParticipantForm({
  mode,
  initial,
  submitting,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: ParticipantInput;
  submitting: boolean;
  onSubmit: (draft: ParticipantInput) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<ParticipantInput>(initial);
  const [errors, setErrors] = useState<ParticipantErrors>({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);

  function set<K extends keyof ParticipantInput>(key: K, value: ParticipantInput[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function setAddress(
    which: "presentAddress" | "permanentAddress",
    patch: Partial<ParticipantInput["presentAddress"]>,
  ) {
    setDraft((prev) => ({ ...prev, [which]: { ...prev[which], ...patch } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateParticipant(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setShowErrorSummary(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setShowErrorSummary(false);
    void onSubmit(draft);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {showErrorSummary && errorCount > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              Please fix {errorCount} {errorCount === 1 ? "field" : "fields"} before saving.
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {Object.values(errors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <Section title="Personal Information" description="Basic identity details">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="First Name"
            required
            value={draft.firstName}
            onChange={(v) => set("firstName", v)}
            error={errors.firstName}
          />
          <TextField
            label="Middle Name"
            value={draft.middleName}
            onChange={(v) => set("middleName", v)}
          />
          <TextField
            label="Last Name"
            required
            value={draft.lastName}
            onChange={(v) => set("lastName", v)}
            error={errors.lastName}
          />
          <TextField
            label="Preferred Name"
            value={draft.preferredName}
            onChange={(v) => set("preferredName", v)}
          />
          <SelectField
            label="Gender"
            value={draft.gender}
            options={GENDER_OPTIONS}
            onChange={(v) => set("gender", v)}
          />
          <TextField
            label="Date of Birth"
            type="date"
            value={draft.dob}
            onChange={(v) => set("dob", v)}
            error={errors.dob}
          />
          <SelectField
            label="Marital Status"
            value={draft.martialStatus}
            options={MARITAL_OPTIONS}
            onChange={(v) => set("martialStatus", v)}
          />
          <SelectField
            label="Primary Language"
            value={draft.primaryLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => set("primaryLanguage", v)}
          />
          <SelectField
            label="Secondary Language"
            value={draft.secondaryLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => set("secondaryLanguage", v)}
          />
        </div>
      </Section>

      <Section title="Contact Information" description="How to reach this participant">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Email"
            type="email"
            value={draft.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
          />
          <PhoneField
            label="Mobile Phone"
            code={draft.countryCode}
            phone={draft.phoneNumber}
            onCodeChange={(v) => set("countryCode", v)}
            onPhoneChange={(v) => set("phoneNumber", v)}
            error={errors.phoneNumber}
          />
          <PhoneField
            label="Home Phone"
            code={draft.homeCountryCode}
            phone={draft.homePhoneNumber}
            onCodeChange={(v) => set("homeCountryCode", v)}
            onPhoneChange={(v) => set("homePhoneNumber", v)}
          />
          <PhoneField
            label="Work Phone"
            code={draft.workCountryCode}
            phone={draft.workPhoneNumber}
            onCodeChange={(v) => set("workCountryCode", v)}
            onPhoneChange={(v) => set("workPhoneNumber", v)}
          />
        </div>
      </Section>

      <Section title="Address" description="Present and permanent address">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground">Present Address</p>
            <TextField
              label="Street"
              value={draft.presentAddress.streetName}
              onChange={(v) => setAddress("presentAddress", { streetName: v })}
            />
            <div className="grid grid-cols-3 gap-2">
              <TextField
                label="City"
                value={draft.presentAddress.city}
                onChange={(v) => setAddress("presentAddress", { city: v })}
              />
              <TextField
                label="State"
                value={draft.presentAddress.state}
                onChange={(v) => setAddress("presentAddress", { state: v })}
              />
              <TextField
                label="ZIP"
                value={draft.presentAddress.zip}
                onChange={(v) => setAddress("presentAddress", { zip: v })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground">Permanent Address</p>
            <TextField
              label="Street"
              value={draft.permanentAddress.streetName}
              onChange={(v) => setAddress("permanentAddress", { streetName: v })}
            />
            <div className="grid grid-cols-3 gap-2">
              <TextField
                label="City"
                value={draft.permanentAddress.city}
                onChange={(v) => setAddress("permanentAddress", { city: v })}
              />
              <TextField
                label="State"
                value={draft.permanentAddress.state}
                onChange={(v) => setAddress("permanentAddress", { state: v })}
              />
              <TextField
                label="ZIP"
                value={draft.permanentAddress.zip}
                onChange={(v) => setAddress("permanentAddress", { zip: v })}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Country"
            value={draft.country}
            options={COUNTRY_OPTIONS}
            onChange={(v) => set("country", v)}
          />
          <SelectField
            label="State"
            value={draft.state}
            options={STATE_OPTIONS}
            onChange={(v) => set("state", v)}
          />
          <SelectField
            label="City"
            value={draft.city}
            options={CITY_OPTIONS}
            onChange={(v) => set("city", v)}
          />
          <TextField
            label="ZIP Code"
            value={draft.zipCode}
            onChange={(v) => set("zipCode", v)}
            error={errors.zipCode}
          />
        </div>
      </Section>

      <Section title="Organization & Enrollment" description="Program and organizational assignment">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LookupSelect
            label="Organization"
            options={ORGANIZATIONS}
            value={draft.organizationId}
            onChange={(v) => set("organizationId", v)}
          />
          <LookupSelect
            label="Agency"
            options={AGENCIES}
            value={draft.agencyId}
            onChange={(v) => set("agencyId", v)}
          />
          <LookupSelect
            label="Group"
            options={GROUPS}
            value={draft.groupId}
            onChange={(v) => set("groupId", v)}
          />
          <LookupSelect
            label="Role"
            options={ROLES}
            value={draft.roleId}
            onChange={(v) => set("roleId", v)}
          />
          <TextField
            label="MRN Number"
            value={draft.mrnNumber}
            onChange={(v) => set("mrnNumber", v)}
          />
          <SelectField
            label="Residence Type"
            value={draft.residenceType}
            options={RESIDENCE_OPTIONS}
            onChange={(v) => set("residenceType", v)}
          />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ChipMultiSelect
            label="Locations"
            options={LOCATIONS}
            value={draft.locationId}
            onChange={(v) => set("locationId", v)}
          />
          <ChipMultiSelect
            label="Centers"
            options={LOCATIONS}
            value={draft.center}
            onChange={(v) => set("center", v)}
          />
          <ChipMultiSelect
            label="Services"
            options={SERVICES}
            value={draft.services}
            onChange={(v) => set("services", v)}
          />
        </div>
      </Section>

      <Section title="Care Preferences" description="Caregiver preferences and relationships">
        <div className="grid gap-3 lg:grid-cols-2">
          <ChipMultiSelect
            label="Preferred Caregivers"
            options={CAREGIVERS}
            value={draft.preferredCaregiverId}
            onChange={(v) => set("preferredCaregiverId", v)}
          />
          <ChipMultiSelect
            label="Not Preferred Caregivers"
            options={CAREGIVERS}
            value={draft.notPreferredCaregiverId}
            onChange={(v) => set("notPreferredCaregiverId", v)}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LookupSelect
            label="Orientation Caregiver"
            options={CAREGIVERS}
            value={draft.orientCaregiverId}
            onChange={(v) => set("orientCaregiverId", v)}
          />
          <SelectField
            label="Relationship"
            value={draft.relationship}
            options={RELATIONSHIP_OPTIONS}
            onChange={(v) => set("relationship", v)}
          />
        </div>
      </Section>

      <Section
        title="Emergency Contact 1"
        description="Primary emergency contact"
      >
        <EmergencyContactSection
          index={1}
          contact={getEmergencyContact(draft, 1)}
          onChange={(ec) => setDraft((prev) => applyEmergencyContact(prev, 1, ec))}
        />
      </Section>

      <Section
        title="Emergency Contact 2"
        description="Secondary emergency contact (optional)"
      >
        <EmergencyContactSection
          index={2}
          contact={getEmergencyContact(draft, 2)}
          onChange={(ec) => setDraft((prev) => applyEmergencyContact(prev, 2, ec))}
        />
      </Section>

      <Section title="Care Circle" description="Family and friends involved in care">
        <CareCircleEditor
          members={draft.careCircle}
          onChange={(v) => set("careCircle", v)}
        />
      </Section>

      <Section title="Additional Information" description="Notes, instructions, and flags">
        <div className="grid gap-3">
          <TextField
            label="Home Instruction"
            value={draft.homeInstruction}
            onChange={(v) => set("homeInstruction", v)}
          />
          <TextField
            label="Notes"
            value={draft.notes}
            onChange={(v) => set("notes", v)}
          />
          <TextField
            label="Social Security Number"
            value={draft.socialSecurity}
            onChange={(v) => set("socialSecurity", v)}
            placeholder="XXX-XX-XXXX"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SwitchField
            label="Lockbox Code"
            checked={draft.LockboxCode}
            onChange={(v) => set("LockboxCode", v)}
          />
          <SwitchField
            label="High Risk"
            checked={draft.highRisk}
            onChange={(v) => set("highRisk", v)}
          />
          <SwitchField
            label="Enrolled"
            checked={draft.enrollmentStatus}
            onChange={(v) => set("enrollmentStatus", v)}
          />
          <SwitchField
            label="Profile Completed"
            checked={draft.isProfileCompleted}
            onChange={(v) => set("isProfileCompleted", v)}
          />
          <SwitchField
            label="Profile Verified"
            checked={draft.isProfileVerified}
            onChange={(v) => set("isProfileVerified", v)}
          />
          <SelectField
            label="Status"
            value={draft.status}
            options={STATUS_OPTIONS}
            onChange={(v) => set("status", v)}
          />
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          render={<Link href="/participants" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving..."
            : mode === "create"
              ? "Create Participant"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

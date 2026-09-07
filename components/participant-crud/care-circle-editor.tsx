"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "@/components/crud/form-fields";
import type { CareCircleMember } from "@/lib/participant-crud/types";
import { RELATIONSHIP_OPTIONS } from "@/lib/participant-crud/config";

function newMember(): CareCircleMember {
  return {
    id: `cc-${Math.random().toString(36).slice(2, 8)}`,
    firstName: "",
    middleName: "",
    lastName: "",
    relationship: "",
    email: "",
    countryCode: "+1",
    phone: "",
  };
}

export function CareCircleEditor({
  members,
  onChange,
}: {
  members: CareCircleMember[];
  onChange: (members: CareCircleMember[]) => void;
}) {
  function update(id: string, patch: Partial<CareCircleMember>) {
    onChange(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function remove(id: string) {
    onChange(members.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No care circle members added yet.
        </p>
      ) : (
        members.map((m, i) => (
          <div
            key={m.id}
            className="rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Member {i + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                aria-label="Remove member"
                onClick={() => remove(m.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="First Name"
                value={m.firstName}
                onChange={(v) => update(m.id, { firstName: v })}
              />
              <TextField
                label="Middle Name"
                value={m.middleName}
                onChange={(v) => update(m.id, { middleName: v })}
              />
              <TextField
                label="Last Name"
                value={m.lastName}
                onChange={(v) => update(m.id, { lastName: v })}
              />
              <SelectField
                label="Relationship"
                value={m.relationship}
                options={RELATIONSHIP_OPTIONS}
                onChange={(v) => update(m.id, { relationship: v })}
              />
              <TextField
                label="Email"
                type="email"
                value={m.email}
                onChange={(v) => update(m.id, { email: v })}
              />
              <div className="flex gap-2">
                <TextField
                  label="Code"
                  value={m.countryCode}
                  onChange={(v) => update(m.id, { countryCode: v })}
                  className="w-16"
                />
                <div className="flex-1">
                  <TextField
                    label="Phone"
                    value={m.phone}
                    onChange={(v) => update(m.id, { phone: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...members, newMember()])}
        >
          <Plus className="size-4" /> Add Care Circle Member
        </Button>
      </div>
    </div>
  );
}

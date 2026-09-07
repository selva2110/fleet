"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ParticipantForm } from "@/components/participant-crud/participant-form";
import { useParticipantStore } from "@/lib/participant-crud/store";
import { emptyParticipant } from "@/lib/participant-crud/config";
import type { ParticipantInput } from "@/lib/participant-crud/types";

export default function CreateParticipantPage() {
  const router = useRouter();
  const { create } = useParticipantStore();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(draft: ParticipantInput) {
    setSubmitting(true);
    try {
      const created = await create(draft);
      router.push(`/participants/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Add Participant"
        description="Create a new participant profile"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/participants" />}>
            <ArrowLeft className="size-4" /> Back
          </Button>
        }
      />
      <div className="p-6">
        <ParticipantForm
          mode="create"
          initial={emptyParticipant()}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

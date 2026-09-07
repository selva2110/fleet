"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common";
import { LoadingState } from "@/components/data-view/data-view";
import { Button } from "@/components/ui/button";
import { ParticipantForm } from "@/components/participant-crud/participant-form";
import { useParticipantStore } from "@/lib/participant-crud/store";
import { fullName } from "@/lib/participant-crud/config";
import type { ParticipantInput } from "@/lib/participant-crud/types";

export default function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, isLoading, update } = useParticipantStore();
  const participant = getById(id);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(draft: ParticipantInput) {
    setSubmitting(true);
    try {
      await update(id, draft);
      router.push(`/participants/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && !participant) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <p className="text-sm text-muted-foreground">Participant not found.</p>
        <Button variant="outline" render={<Link href="/participants" />}>
          <ArrowLeft className="size-4" /> Back to Participants
        </Button>
      </div>
    );
  }

  // Strip server-owned fields to produce the editable input shape.
  const { id: _id, createdAt: _createdAt, ...input } = participant;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={`Edit ${fullName(participant)}`}
        description="Update participant profile"
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/participants/${id}`} />}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
        }
      />
      <div className="p-6">
        <ParticipantForm
          mode="edit"
          initial={input}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
